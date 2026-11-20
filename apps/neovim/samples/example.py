"""Comparison sample: parse a log file and report request statistics."""
from __future__ import annotations

import argparse
import csv
import statistics
import sys
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache, partial
from itertools import groupby
from typing import ClassVar, Iterator, Protocol, TypedDict

LINE_FORMAT = "%Y-%m-%d %H:%M:%S"
SLOW_MS = 250.5
BUCKETS = (10, 50, 100, 500)
__version__ = "0.3.0"


class Row(TypedDict):
    when: str
    path: str
    status: int
    millis: float


class Reader(Protocol):
    def read(self, size: int = -1) -> str: ...


@dataclass(frozen=True)
class Request:
    when: datetime
    path: str
    status: int
    millis: float
    kind: ClassVar[str] = "http"

    @property
    def slow(self) -> bool:
        return self.millis >= SLOW_MS

    def bucket(self) -> int:
        for limit in BUCKETS:
            if self.millis < limit:
                return limit
        return BUCKETS[-1] * 2


class ParseError(ValueError):
    pass


@lru_cache(maxsize=128)
def normalize(path: str) -> str:
    """Collapse numeric path segments so /users/1 and /users/2 group together."""
    parts = ["{id}" if part.isdigit() else part for part in path.split("/")]
    return "/".join(parts)


def parse_line(line: str, number: int) -> Request:
    try:
        when, path, status, millis = line.rstrip("\n").split("\t")
        return Request(datetime.strptime(when, LINE_FORMAT), normalize(path), int(status), float(millis))
    except (ValueError, TypeError) as exc:
        raise ParseError(f"line {number}: {exc}") from exc


@contextmanager
def opened(name: str) -> Iterator[Reader]:
    handle = sys.stdin if name == "-" else open(name, encoding="utf-8")
    try:
        yield handle
    finally:
        if handle is not sys.stdin:
            handle.close()


def requests(reader: Reader) -> Iterator[Request]:
    for number, line in enumerate(reader, start=1):
        if not line.strip() or line.startswith("#"):
            continue
        yield parse_line(line, number)


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round(fraction * (len(ordered) - 1)))
    return ordered[index]


def report(items: list[Request]) -> dict[str, object]:
    by_path = Counter(item.path for item in items)
    errors = [item for item in items if item.status >= 500]
    durations = [item.millis for item in items]
    return {
        "count": len(items),
        "errors": len(errors),
        "mean": statistics.fmean(durations) if durations else 0.0,
        "p95": percentile(durations, 0.95) if durations else 0.0,
        "top": by_path.most_common(3),
        "slow": sum(1 for item in items if item.slow),
    }


def hourly(items: list[Request]) -> dict[str, int]:
    key = lambda item: item.when.replace(minute=0, second=0)  # noqa: E731
    return {
        f"{hour:%H:00}": len(list(group))
        for hour, group in groupby(sorted(items, key=key), key=key)
    }


def write_csv(items: list[Request], out) -> None:
    writer = csv.writer(out)
    writer.writerow(["when", "path", "status", "millis"])
    for item in items:
        writer.writerow([item.when.isoformat(), item.path, item.status, f"{item.millis:.1f}"])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("log", help="log file, or - for standard input")
    parser.add_argument("--since", type=int, default=24, metavar="HOURS")
    parser.add_argument("--csv", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    cutoff = datetime.now() - timedelta(hours=args.since)
    with opened(args.log) as reader:
        try:
            items = [item for item in requests(reader) if item.when >= cutoff]
        except ParseError as error:
            print(f"error: {error}", file=sys.stderr)
            return 2
    if args.csv:
        write_csv(items, sys.stdout)
        return 0
    summary = report(items)
    width = max(map(len, summary)) + 1
    for name, value in summary.items():
        print(f"{name:<{width}}{value!r}")
    for hour, count in hourly(items).items():
        print(hour, "#" * min(count, 40), count)
    printer = partial(print, sep=" | ", end="\n")
    printer(*[b for b in BUCKETS if b > 10], None, True)
    return int(summary["errors"] > 0)


if __name__ == "__main__":
    sys.exit(main())
