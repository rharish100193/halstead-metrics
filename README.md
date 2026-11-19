# halstead-metrics

Monorepo for Halstead software-science metrics. Every supported language uses the same formulas and the same classification: keywords and operators are operators, identifiers and literals are operands, and comments are skipped. The desktop app browses a source file and writes HTML and PDF reports.

## Packages

| Package | Role |
| --- | --- |
| `packages/halstead-metrics` | Core library. Tokenizes source, classifies operators and operands, and renders the HTML and PDF reports. |
| `packages/halstead-metrics-cli` | `halstead <path>` prints the JSON report to stdout. |
| `packages/halstead-metrics-desktop` | Desktop application. Browse files, read the metrics, and open an HTML or PDF report. |

## Desktop application

```bash
npm install
npm start
```

A file tree is on the left. The metrics panel shows the file name and the calculated measures. **Source** shows the file with keywords, strings, comments, and numbers highlighted. **HTML report** and **PDF report** write `Name.html` or `Name.pdf` next to the source file (the stem is everything before the first dot) and open it.

**File → Open File...** jumps the tree to a supported source file. **File → Exit** quits.

The HTML report names the file, summarizes the measures, explains Halstead metrics and how to read this file, lists the formulas, then the operators, operands, and measured values. The PDF report has the same sections in a printable layout. Counts are the classified totals. Metric values are rounded to two decimal places with half-even rounding, and whole numbers are shown with one decimal place (`5.0`).

## Command line

```bash
npm run cli -- examples/Sample.java
node packages/halstead-metrics-cli/index.js examples/hello.c
```

With `packages/halstead-metrics-cli` installed, the `halstead` command does the same thing:

```bash
halstead <path>
```

Supported languages are Java (`.java`), C (`.c`, `.h`), C++ (`.cpp`, `.cc`, `.cxx`, `.c++`, `.hpp`, `.hh`, `.hxx`), C# (`.cs`), JavaScript (`.js`, `.mjs`, `.cjs`, `.jsx`), TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`), Python (`.py`), Go (`.go`), Rust (`.rs`), PHP (`.php`), Ruby (`.rb`), Kotlin (`.kt`, `.kts`), Swift (`.swift`), Scala (`.scala`), Dart (`.dart`), SQL (`.sql`), shell (`.sh`, `.bash`, `.zsh`), PowerShell (`.ps1`), Perl (`.pl`, `.pm`), Lua (`.lua`), R (`.r`), Haskell (`.hs`), Elixir (`.ex`, `.exs`), Erlang (`.erl`), Objective-C (`.m`, `.mm`), Groovy (`.groovy`), Zig (`.zig`), Julia (`.jl`), Visual Basic (`.vb`), F# (`.fs`), Clojure (`.clj`, `.cljs`), Fortran (`.f90` and later), Solidity (`.sol`), OCaml (`.ml`), Pascal (`.pas`), Ada (`.adb`, `.ads`), COBOL (`.cbl`, `.cob`), Lisp (`.lisp`), Scheme (`.scm`), Awk (`.awk`), Nim (`.nim`), D (`.d`), Elm (`.elm`), and GraphQL (`.graphql`, `.gql`).

Markup and data files (HTML, CSS, JSON, YAML, XML, Markdown) are not scored. `.m` is Objective-C. `.pl` is Perl. `.h` is C.

No arguments, `-h`, `--help`, and `-help` print usage and exit `1`. An unreadable path exits `2`. Any other extension exits `3`.

Stdout is one JSON object:

```json
{
  "Halstead": {
    "n1": 3,
    "n2": 2,
    "N1": 3,
    "N2": 2,
    "Vocabulary": 5,
    "Length": 5,
    "Estimated program length": 6.75,
    "Volume": 11.61,
    "Difficulty": 1.5,
    "Effort": 17.41,
    "Programming time": 0.97,
    "Purity ratio": 1.35,
    "_Operands": { "x": "1", "1": "1" },
    "_Operators": { "int": "1", ";": "1", "=": "1" }
  },
  "filename": "Sample.java"
}
```

Counts inside `_Operands` and `_Operators` are strings. `filename` is the path you passed in.

| Field | Formula |
| --- | --- |
| n1, N1 | Distinct and total operators |
| n2, N2 | Distinct and total operands |
| Vocabulary | n1 + n2 |
| Length | N1 + N2 |
| Estimated program length | n1 log2(n1) + n2 log2(n2) |
| Purity ratio | estimated length / length |
| Volume | length × log2(vocabulary) |
| Difficulty | (n1 / 2) × (N2 / n2) |
| Effort | volume × difficulty |
| Programming time | effort / 18 |

## What counts as an operator

Every language uses the same rules.

- Language keywords are operators, including C++ keywords in `.cc` and `.c++`.
- Operators include `+` `++` `-` `--` `*` `.` `;` `,` `/` `%` `!` `>` `<` `>=` `<=` `==` `!=` `=` `:` `&&` `||` `<<` `>>` `::` `->` `=>` and the other symbols in the shared operator list.
- When a brace pair is balanced, `{ }`, `( )`, `[ ]`, or `< >` is an extra operator. The individual `(` `)` `{` `}` `[` `]` tokens are still operands.
- String literals stay one operand, including Python prefixes and quotes. Identifiers, numbers, and any other remaining token are operands.
- Whitespace and comments are skipped. A `#` line at the start of a line is skipped in C and C++.

## API

```javascript
const { analyzeSource, reportSource, renderHtmlReport, renderPdfReport } = require("halstead-metrics");

const metrics = analyzeSource("int x = 1;", "java");
const report = reportSource("int x = 1;", "java", "Sample.java");
const html = renderHtmlReport(metrics, "Sample.java");
const pdf = await renderPdfReport(metrics, "Sample.java");
```

`analyzeSource` takes the source text and the extension without a dot (`java`, `py`, `ts`, and the rest of the supported set). `renderHtmlReport` returns a string. `renderPdfReport` returns a `Buffer`.

## Tests

Unit tests cover classification, rounding, report text, the CLI exit codes, source highlighting, and file reading. Integration tests run the checked-in Java, C, and C++ examples through the library and the CLI, and drive the desktop page: open a file, read the metrics, export HTML and PDF, expand a folder, and use File Open.

```bash
npm test
npm run test:unit
npm run test:integration
```

GitHub Actions runs both on `ubuntu-latest` for every push and pull request. The job does not download Electron, so it stays inside the free GitHub-hosted runner minutes.
