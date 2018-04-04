import * as assert from 'assert';
import * as Debug from 'debug';
const debug = Debug('prediction');

import { ExecutionGenerator } from '../core/execution';
import { RunJavaObjectServer } from '../java/runjobj';
import { CachingExecutor } from '../java/executor';
import { Outcome } from '../outcome';
import { Consistency } from '../consistency';

export class OutcomePredictor {
  server: RunJavaObjectServer;
  generator: ExecutionGenerator;

  constructor({ server, generator }) {
    this.server = server;
    this.generator = generator;
  }

  async * outcomes(schema) {
    debug(`predicting outcomes for schema %s`, schema);
    let unique = new Set();
    let executor = new CachingExecutor(this.server);

    for await (let execution of this.generator.getExecutions(schema)) {
      let results = await execution.execute(executor);
      let string = JSON.stringify(results);

      if (!unique.has(string))
        yield this._resultsToOutcome(results, schema);

      unique.add(string);
    }
    debug(`predicated ${unique.size} outcomes`);
  }

  _resultsToOutcome(results, schema) {
    for (let sequence of schema.sequences)
      for (let invocation of sequence.invocations)
        if (invocation.method.void)
          results[invocation.id] = undefined;

    let outcome = new Outcome({ results, consistency: Consistency.top() });
    debug(`got %s`, outcome);
    return outcome;
  }
}
