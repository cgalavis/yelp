#!/usr/bin/env node

import { Yelp, LoadPlanOptions } from "../yelp";
import { date } from "@crabel/util";
import  program = require("commander");

type PlanOptions = LoadPlanOptions & {
    term: string;
    radius: number;
    location: number | string;
}

let yelp = new Yelp();

let filters = {
    term: "restaurant",
    location: 91356,
    set(options: PlanOptions) {
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
    .action((o: PlanOptions) => {
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


