#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yelp_1 = require("../yelp");
const program = require("commander");
let yelp = new yelp_1.Yelp();
let filters = {
    term: "restaurant",
    location: 91356,
    set(options) {
        this.term = options.term || this.term;
        this.location = options.location || this.location;
        return this;
    }
};
program
    .version("1.0.0")
    .description("Import data from Yelp.");
program
    .command("plan")
    .description("Generate an execution plan with the given parameters.")
    .option("-t,--term <TERM>", "Term to search for, default is 'restaurant'")
    .option("-r,--radius <RADIUS>", "Radius of the search.")
    .option("-l,--location <LOCATION>", "Location parameter, can be a city, zip code, etc.")
    .option("--force", "Forces the creation of a new plan if one is in progress.")
    .option("-V,--verbose", "Print plan details to the console.")
    .action((o) => {
    yelp.loadPlan(filters.set(o), o.radius || 6, o).then();
});
program
    .command("exec")
    .description("Execute a previously generated plan.")
    .action((options) => {
    yelp.execPlan(options).then();
});
program
    .command("verify")
    .description("Verify that the data files are consistent with the execution plan.")
    .option("-t,--tolerance <TOLERANCE>", "")
    .action((options) => {
    yelp.verifyExec(options);
});
program
    .command("stitch")
    .description("Stitch together data files generated during plan execution.")
    .option("-t,--target-dir <DIR>", "Location the data will be stored.")
    .action((options) => {
    yelp.stitchData(options);
});
program
    .parse(process.argv);
//# sourceMappingURL=importer.js.map