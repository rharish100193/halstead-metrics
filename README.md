# halstead-metrics-cli

Node.js port of the [Halstead Metrics Tool](https://sourceforge.net/projects/halsteadmetricstool) for Java, C, and C++. It tokenizes a source file, classifies operators and operands the same way the Java analyzer does, and prints Halstead metrics as JSON.

## Usage

```bash
node index.js examples/Sample.java
node index.js examples/hello.c
node index.js examples/hello.cpp
```

With the package installed, the `halstead` command does the same thing:

```bash
halstead <path>
```

Supported extensions are `.java`, `.c`, `.cc`, `.cpp`, and `.c++`.

No arguments, `-h`, `--help`, and `-help` print usage and exit `1`. An unreadable path exits `2`. Any other extension exits `3`.

## Output

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

Counts inside `_Operands` and `_Operators` are strings, matching the original CLI. Metric fields are rounded to two decimal places with half-even rounding. `filename` is the path you passed in.

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

The classifier follows `KeywordAnalyzer`, `SymbolAnalyzer`, `BracesAnalyzer`, and `LiteralAnalyzer`:

- Language keywords are operators. `.cc` and `.c++` are lexed as C++ but, as in the Java tool, the C++ keyword list is applied only for `.cpp`.
- These symbols are operators: `+` `++` `-` `--` `*` `.` `;` `/` `%` `!` `>` `<` `>=` `<=` `==` `=` `:` `~`.
- When a brace pair is balanced, `{ }`, `( )`, `[ ]`, or `< >` is an extra operator. The individual `(` `)` `{` `}` `[` `]` tokens are still operands.
- String literals and every remaining token (identifiers, numbers, other punctuation) are operands.
- Whitespace, comments, and preprocessor lines are skipped.

## API

```javascript
const { analyzeSource, reportSource } = require("halstead-metrics-cli");

const metrics = analyzeSource("int x = 1;", "java");
const report = reportSource("int x = 1;", "java", "Sample.java");
```

## Tests

```bash
npm test
```
