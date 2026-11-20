# Notes CLI

A fast command line tool for keeping notes in plain Markdown. This file is the
**comparison sample** for Markdown, written like a typical project README.

![Screenshot](docs/screenshot.png)

[![CI](https://img.shields.io/github/actions/workflow/status/example/notes/ci.yml)](https://example.com/actions)
[![npm](https://img.shields.io/npm/v/notes-cli.svg)](https://www.npmjs.com/package/notes-cli)

## Features

- Notes are plain `.md` files, so any editor works
- Full-text search with *fuzzy* matching
- Tags, links between notes and **backlinks**
  - Tags can be nested: `work/projects/alpha`
  - Links use the `[[wiki]]` style
- Works offline and syncs through Git

## Getting started

### Installation

```
curl -fsSL https://example.com/install.sh | sh
notes --version
```

On macOS you can also use Homebrew:

```
brew install example/tap/notes
```

### Quick tour

Create a note, then search for it:

```
notes new "Weekly review" --tag work
notes search "review" --limit 5
```

Notes can be scripted from TypeScript:

```typescript
import { Notes } from 'notes-cli';

const notes = new Notes({ dir: '~/notes' });
for (const note of await notes.search('review')) {
  console.log(note.title, note.tags.join(', '));
}
```

and from Go:

```go
store, err := notes.Open("~/notes")
if err != nil {
	log.Fatal(err)
}
fmt.Println(store.Count())
```

Configuration lives in `~/.config/notes/config.json`:

```json
{
  "editor": "nvim",
  "dateFormat": "YYYY-MM-DD",
  "sync": { "remote": "origin", "auto": true }
}
```

## Commands

| Command  | Description                 | Example                 |
| -------- | --------------------------- | ----------------------- |
| `new`    | Create a note               | `notes new "Title"`     |
| `search` | Search titles and bodies    | `notes search term`     |
| `tag`    | Add or remove tags          | `notes tag add idea`    |
| `sync`   | Push and pull through Git   | `notes sync`            |

> **Tip**
> Run `notes help <command>` to see every flag of a command.

> Quoted text can span several lines
> and contain *emphasis* and `code`.

## Roadmap

1. Encrypted notes
2. A terminal user interface
3. Mobile companion app
   1. Read-only first
   2. Editing later

- [x] Full-text search
- [x] Tags
- [ ] Encryption
- [ ] ~~Web clipper~~

## FAQ

Where are notes stored?
: In the directory configured with `dir`, one file per note.

Is there a Windows build?
: Yes. See the [downloads page](https://example.com/downloads) or run the installer from <https://example.com/install.ps1>.

## License

Released under the MIT license; see [LICENSE](LICENSE) for the full text.
Copyright (c) 2026 the Notes CLI contributors.<br>
Contact: <hello@example.com>

***

Last updated on 2026-11-20.[^note]

[^note]: Dates use the ISO 8601 format.
