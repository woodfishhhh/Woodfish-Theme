"""Statistics corpus: a tiny task scheduler with retries and metrics."""
from __future__ import annotations

import asyncio
import dataclasses
import json
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Generic, Iterable, Optional, TypeVar

T = TypeVar("T")
logger = logging.getLogger(__name__)
# Tunables for the scheduler.
TIMEOUT = 30.0  # seconds
SEPARATOR = "\n---\n"  # escapes: \t \x41 \u00e9
MAX_RETRIES: int = 3
PATTERN = re.compile(r"^(?P<name>[a-z_]+)-(?P<id>\d+)$", re.IGNORECASE)


class Status(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class SchedulerError(Exception):
    """Raised when a task cannot be scheduled."""

    def __init__(self, message: str, *, code: int = 1) -> None:
        super().__init__(message)
        self.code = code


def retry(times: int = 3, delay: float = 0.5) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_error: Optional[Exception] = None
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except (OSError, TimeoutError) as error:
                    last_error = error
                    logger.warning("attempt %d failed: %s", attempt, error)
                    time.sleep(delay * attempt)
            raise SchedulerError(f"gave up after {times} tries") from last_error

        return wrapper

    return decorator


@dataclass(order=True)
class Task(Generic[T]):
    priority: int
    name: str = field(compare=False)
    payload: T | None = field(default=None, compare=False)
    status: Status = Status.PENDING
    tags: list[str] = field(default_factory=list)

    @property
    def ident(self) -> str:
        match = PATTERN.match(self.name)
        return match.group("id") if match else "0"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Task[Any]":
        return cls(priority=int(data.get("priority", 0)), name=data["name"], payload=data.get("payload"))

    @staticmethod
    def is_valid(name: str) -> bool:
        return bool(PATTERN.fullmatch(name))

    def __repr__(self) -> str:
        return f"Task({self.name!r}, priority={self.priority}, status={self.status.value})"


class Scheduler:
    def __init__(self, workers: int = 4, *, verbose: bool = False) -> None:
        self.workers = workers
        self.verbose = verbose
        self._queue: list[Task[Any]] = []
        self._stats: defaultdict[str, int] = defaultdict(int)

    def add(self, task: Task[Any]) -> None:
        if task.status is not Status.PENDING:
            raise SchedulerError("only pending tasks can be added", code=2)
        self._queue.append(task)
        # keep the highest priority first
        self._queue.sort(reverse=True)

    def extend(self, tasks: Iterable[Task[Any]]) -> None:
        for task in tasks:
            self.add(task)

    @retry(times=MAX_RETRIES)
    def save(self, target: Path) -> int:
        rows = [dataclasses.asdict(task) for task in self._queue]
        with target.open("w", encoding="utf-8") as handle:
            json.dump(rows, handle, indent=2, default=str)
        return len(rows)

    async def run_one(self, task: Task[Any]) -> Status:
        task.status = Status.RUNNING
        try:
            await asyncio.wait_for(asyncio.sleep(0.01), timeout=TIMEOUT)
        except asyncio.TimeoutError:
            task.status = Status.FAILED
        else:
            task.status = Status.DONE
        finally:
            self._stats[task.status.value] += 1
        return task.status

    async def run(self) -> dict[str, int]:
        semaphore = asyncio.Semaphore(self.workers)

        async def guarded(task: Task[Any]) -> Status:
            async with semaphore:
                return await self.run_one(task)

        results = await asyncio.gather(*(guarded(task) for task in self._queue))
        if self.verbose:
            print(f"finished {len(results)} tasks in {self.elapsed():.2f}s")
        return dict(self._stats)

    def elapsed(self) -> float:
        return sum(self._stats.values()) * 0.001


def summarize(tasks: list[Task[Any]]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    # group names by status, most urgent first
    for task in sorted(tasks, key=lambda item: (item.status.value, -item.priority)):
        groups.setdefault(task.status.value, []).append(task.name)
    squares = {number: number**2 for number in range(10) if number % 2 == 0}
    flat = [name for names in groups.values() for name in names]
    if (count := len(flat)) > 3 and squares:
        groups["total"] = [str(count)]
    return groups


def main(argv: list[str] | None = None) -> int:
    scheduler = Scheduler(workers=2, verbose=True)
    scheduler.extend(Task(priority=index, name=f"job-{index}") for index in range(5))
    match argv:
        case [] | None:
            outcome = asyncio.run(scheduler.run())
        case ["dry-run", *rest]:
            outcome = {"skipped": len(rest)}
        case _:
            raise SystemExit(0x2)
    print(outcome, 3.14, 1_000, 0b101, None, True, False)
    return 0 if outcome else 1


if __name__ == "__main__":
    raise SystemExit(main())
