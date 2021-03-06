import * as assert from 'assert';
import * as Debug from 'debug';
const debug = Debug('jcstress:reader');

const STATUS_LINE = /\[(OK|FAILED|ERROR)\]\s+([A-Za-z_$.]+([0-9]+))\s*$/;
const RESULT_LINE = /^\s+(.*)\s+([0-9,]+)\s+([A-Z_]+)\s+(.*)\s*$/;
const FINISH_LINE = /RUN (COMPLETE)\./;

function match(line: string, pattern: RegExp) {
  return (line.match(pattern) || []).slice(1).map(s => s.trim());
}

export type Outcome = {
  value: string;
  count: number;
  expectation: string;
  description: string;
};

export type Result = {
  name: string,
  index: number;
  status: boolean;
  outcomes: Outcome[];
  total?: number;
};

export class JCStressOutputReader {
  generator: AsyncIterable<string>;

  constructor(generator) {
    this.generator = generator;
  }

  async * getResults(): AsyncIterable<Result> {
    let errorClass: string | undefined;
    let errorMessage: string[] | undefined;
    let pendingResult: Result | undefined;
    let complete = false;

    for await (let line of this.generator) {

      debug(line);

      // NOTE nobody will catch promise rejection if we break out of this loop
      // NOTE for this reason we continue to consume all generated lines

      if (complete)
        continue;

      if (errorMessage) {
        if (line.trim() === '')
          throw errorMessage.join('\n');

        errorMessage.push(line);
      }

      if (line.trim() === 'Messages:') {
        errorMessage = [];
      }

      let [ statusS, name, idxS ] = match(line, STATUS_LINE);

      if (statusS) {
        assert.ok(!pendingResult);
        let index = parseInt(idxS);
        let status = statusS === 'OK';
        assert.notEqual(index, NaN);
        pendingResult = { name, index, status, outcomes: [] };
        continue;
      }

      let [ value, countS, expectation, description ] = match(line, RESULT_LINE);

      if (value) {
        if (pendingResult) {
          let count = parseInt(countS.replace(/,/g,''));
          pendingResult.outcomes.push({ value, count, expectation, description });
          continue;
        } else
          // TODO XXX this is failing nondeterministically. XXX
          assert.fail("Expected pending result.");
      }

      if (pendingResult && !line.trim()) {
        let total = pendingResult.outcomes.reduce((a,o) => a + o.count, 0);
        yield { total, ... pendingResult };
        pendingResult = undefined;
        continue;
      }

      if (complete = match(line, FINISH_LINE).length > 0) {
        assert.ok(!pendingResult);
      }
    }
  }
}
