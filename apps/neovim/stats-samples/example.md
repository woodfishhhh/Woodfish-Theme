# Inventory Service

A small service for tracking stock levels. This file is the **statistics corpus**
for Markdown: it uses the constructs that appear in everyday READMEs.

[![Build](https://img.shields.io/badge/build-passing-green.svg)](https://example.com/ci)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [API](#api)
- [Contributing](#contributing)

## Installation

Install with your package manager of choice:

```
pnpm add @example/inventory-service
# or
npm install --save @example/inventory-service
```

Requires *Node.js* 20 or newer. See the `engines` field in `package.json`.

## Usage

Create a client and ask for the stock of a single item:

```typescript
import { Client } from '@example/inventory-service';

const client = new Client({ baseUrl: 'https://api.example.com', retries: 3 });
const stock: number = await client.stock('A-1001');
console.log(`In stock: ${stock}`);
```

The same call from Python:

```python
from inventory import Client

client = Client("https://api.example.com", retries=3)
print(f"In stock: {client.stock('A-1001')}")
```

### Configuration

Settings are read from `inventory.json`:

```json
{
  "baseUrl": "https://api.example.com",
  "retries": 3,
  "verbose": false
}
```

| Option    | Type      | Default | Description              |
| --------- | --------- | ------- | ------------------------ |
| `baseUrl` | `string`  | none    | Root URL of the service  |
| `retries` | `number`  | `3`     | How often to retry       |
| `verbose` | `boolean` | `false` | Print every request      |

### API

1. `stock(sku)` returns the quantity on hand.
2. `reserve(sku, count)` holds items for a customer.
3. `release(reservation)` frees a reservation again.

> **Note**
> Reservations expire after 15 minutes unless they are confirmed.

Nested lists work too:

* First level
  * Second level with `inline code`
    * Third level with a [link](https://example.com/docs "Documentation")
* Another item with ~~removed~~ text and __strong__ emphasis

Task list for the next release:

- [x] Write the changelog
- [x] Tag the release
- [ ] Publish the package

Setext heading
==============

Another setext heading
----------------------

Some text with a hard break at the end of the line.  
The next line follows, with an autolink <https://example.com> and an
email <support@example.com>, a footnote[^1], and an image: ![logo](assets/logo.png).

[^1]: Footnotes are rendered at the bottom of the page.

---

## Contributing

Please read the [contributing guide][guide] before opening a pull request.

```go
func Add(a, b int) int {
	return a + b
}
```

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

```lua
local function add(a, b)
  return a + b
end
```

    indented code block
    with two lines

<details>
<summary>More information</summary>

HTML blocks are passed through unchanged.

</details>

[guide]: https://example.com/contributing "Contributing guide"
