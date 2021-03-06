import fs = require("fs");
import path = require("path");
import yelp = require('yelp-fusion');
import { obj, num } from "@crabel/util";
import { files, data_dir } from "./config";
import uui = require('uuid/v1');
//
import multimeter = require("multimeter");
import table = require("@crabel/table");
import CoordsCalc = require("./coords-calc");
import pako = require("pako");
import { Base64 } from 'js-base64';

//

const yelp_api_key = "o0VLwk0bQ9Q0wgIl56wglRMVrxOHhky4TviCA8_O3q7CWwpwGYKWn2EF3gMgdQbReW3k7odKDFZ9n8fGR6e2G8ju5227YpVZoo_p5BAnxQJ4qZZsNB5u-S7ofojMW3Yx";
const yelp_max_results = 1000;

let multi : any = null;
let pbar_step, pbar_page, pbar_stitch;

//

export type Coords = {
    latitude: number;
    longitude: number;
    //
    left?: number;
    top?: number;
}

export type YelpFilters = {
    term?: string;
    radius?: number;
    location?: string | number;
    price?: string;
    latitude?: number;
    longitude?: number;
    offset?: number;
    limit?: number;
}

export type AliasTitle = {
    alias: string;
    title: string;
}

export type Location = {
    address1: string;
    address2: string;
    city: string;
    zip_code: string;
    state: string;
    country: string;
    display_address: string[];
}

export type YelpItem = {
    id: string;
    alias: string;
    name: string;
    image_url: string;
    is_closed: boolean;
    url: string;
    review_count: number;
    categories: AliasTitle[];
    rating: number;
    coordinates: Coords,
    transactions: string[];
    price: string;
    location: Location;
    phone: string;
    display_phone: string;
    distance: number;
}

export type ExecStep = Coords & {
    top: number;
    left: number;
    radius: number;
    count: number;
}

export type ExecPlan = {
    uid: string;
    filters: YelpFilters;
    center: Coords;
    radius: number;
    steps: ExecStep[];
    cur_step: number;
}

export type LoadPlanOptions = {
    force?: boolean;
    verbose?: boolean;
}

export type ExecOptions = {
    force: boolean;
}

export type VerifyOptions = {
    tolerance: number | string;
}

export type StitchOptions = {
    targetDir?: string;
}


const convert = {
    meters_per_mile: 1609.34,

    toMiles(m) {
        return m * (1 / this.meters_per_mile);
    },

    toMeters(m) {
        return Math.round(m * this.meters_per_mile);
    }
};


const def_filter = { radius: 1000 };

function stepFile(plan, step_index: number) : string {
    return path.join(data_dir, plan.uid + "_" + num.zeroPad(step_index, 3)) + ".json";
}


//

export class Yelp {

    client: any;
    center: Coords = null;
    query_count: number;
    retry_count: number;
    total_query_time: number;

    //


    constructor() {
        this.client = null;
    }


    //

    static async getCoords(location: string | number) : Promise<Coords> {
        let client = yelp.client(yelp_api_key);
        let res = await client.search({ location });

        return res.jsonBody.region.center;
    }


    async loadPlan(filters: YelpFilters, radius: number, options: LoadPlanOptions) : Promise<ExecPlan> {
        multi = multimeter(process);
        try {
            console.log(`[+] Calculating execution plan from "${filters.location}" with radius of ${radius} miles...`);
            let plan: ExecPlan;
            if (!options.force && fs.existsSync(files.running_plan)) {
                plan = JSON.parse(fs.readFileSync(files.running_plan, "utf8"));
                if (plan.cur_step < (plan.steps.length)) {
                    console.log(`[+] Found pending plan with ${plan.steps.length}, steps ` +
                        `remaining: ${plan.steps.length - plan.cur_step}`);
                    console.log(`    >> Use "node importer plan --force" to replace the pending plan.`);

                    return plan;
                }
            }

            if (!this.center) {
                let res = await this.search({location: filters.location});
                this.center = res.jsonBody.region.center;
                this.center.top = 0;
                this.center.left = 0;
            }

            plan = {
                uid: uui().split("-").join(""),
                filters,
                center: this.center,
                radius,
                steps: [],
                cur_step: 0
            };

            await this._loadPlan(plan, radius, this.center);

            this.savePlan(plan);
            console.log(`[+] Execution plan with ${plan.steps.length} steps was created and saved.`);
            console.log(`    >> Use "node importer exec" to execute the plan.`);
            console.log();

            if (options.verbose) {
                table.log({
                    filters: JSON.stringify(plan.filters),
                    center: `(${plan.center.latitude.toFixed(4)}, ` +
                        `${plan.center.longitude.toFixed(4)})`,
                    radius: plan.radius,
                    step_count: plan.steps.length
                });

                table.log(plan.steps.slice(0, 20), [
                    "top", "left",
                    { caption: "latitude", decimals: 4, },
                    { caption: "longitude", decimals: 4, },
                    { caption: "radius", type: table.DataType.float, decimals: 2 },
                    "count"
                ]);

                if (plan.steps.length > 20)
                    console.log("...");
                console.log();
            }

            return plan;
        }
        finally {
            this.endProcess();
        }
    }

    private async _loadPlan(plan: ExecPlan, radius, coords) {
        try {
            let filters = obj.copy(plan.filters);
            filters.radius = convert.toMeters(radius);
            filters.latitude = coords.latitude;
            filters.longitude = coords.longitude;

            let res = await this.search(filters);
            let count = res.jsonBody.total;

            if (yelp_max_results < count) {
                let corners = expandSearch(coords, radius / 2);

                radius = Math.sqrt(radius * radius + radius * radius) / 2;

                for (let c of corners)
                    await this._loadPlan(plan, radius, c);
            }
            else {
                plan.steps.push({
                    top: coords.top, left: coords.left,
                    latitude: coords.latitude, longitude: coords.longitude,
                    radius: radius, count: count
                });
            }
        }
        catch (err) {
            if (err.statusCode === 400)
                throw err;

            await sleep(1000);
            await this._loadPlan(plan, radius, coords);
        }
    }


    async execPlan(options: ExecOptions) : Promise<void> {
        let plan = this.loadPendingPlan();

        multi = multimeter(process);
        try {
            this.query_count = 0;
            this.retry_count = 0;
            this.total_query_time = 0;

            const items_per_search = 50;

            let total_pages = 0;
            let total_items = 0;
            for (let si=0; si < plan.steps.length; ++si) {
                let s = plan.steps[si];
                total_pages += Math.ceil(s.count / items_per_search);
                total_items += s.count;
            }

            this.initExecProgress();

            plan.filters.limit = items_per_search;

            let item_count = 0;
            let page_count = 0;
            for (let si=0; si < plan.steps.length; ++si) {
                let step = plan.steps[si];
                plan.filters.latitude = step.latitude;
                plan.filters.longitude = step.longitude;
                plan.filters.radius = convert.toMeters(step.radius);

                let step_file = stepFile(plan, si);
                if (!options.force && fs.existsSync(step_file)) {
                    pbar_step.ratio(si, plan.steps.length, `${si}/${plan.steps.length} steps   `);
                    pbar_page.percent(0, "                                ");
                    continue;
                }

                let list = [];
                try {
                    let pages = Math.ceil(step.count / items_per_search);
                    let page = 0;
                    for (let pi = 0; pi < pages; ++pi) {
                        plan.filters.offset = items_per_search * page++;
                        list.push(...(await this.search(plan.filters)).jsonBody.businesses);
                        item_count += list.length;
                        page_count++;

                        pbar_step.ratio(si, plan.steps.length, `${si}/${plan.steps.length} steps   `);
                        pbar_page.ratio(pi, pages, `${pi}/${pages} pages in current step   `);
                    }

                    fs.writeFileSync(stepFile(plan, si), JSON.stringify(list, null, 2), "utf8");
                    plan.cur_step++;
                    this.savePlan(plan);
                }
                catch (err) {
                    if (err.statusCode === 400)
                        throw err;

                    await sleep(1000);
                    this.retry_count++;
                }
            }

            pbar_step.percent(100, "                                ");
            pbar_page.percent(100, "                                ");
        }
        finally {
            this.endProcess();
        }
    }

    verifyExec(options: VerifyOptions) {
        multi = multimeter(process);
        try {
            let plan = this.loadPendingPlan();
            let tol = num.parse(options.tolerance) || 0.01;
            let res = [];

            console.log(`[+] Verifying last execution plan with tolerance ${tol}...`);

            let title = "Plan Verification:     \n";
            multi.write(title);
            let pbar = multi.rel(title.length, 0, {
                width: 40,
                solid: { text: "*", foreground: "magenta" },
                empty: { text: " " }
            });

            for (let i = 0; i < plan.steps.length; ++i) {
                let step_file = stepFile(plan, i);
                if (!fs.existsSync(step_file))
                    console.log(`[*] Data file for step #${i} is missing.`);

                let data = require(step_file);
                if ((plan.steps[i].count - data.length) / plan.steps[i].count > tol)
                    res.push({
                        step: i,
                        actual: data.length,
                        expected: plan.steps[i].count
                    });

                pbar.ratio(i, plan.steps.length, `${i}/${plan.steps.length} steps   `);
            }

            pbar.percent(100, "                                ");

            for (let r of res)
                console.log(`[*] Data file for step #${r.step} has ${r.actual} items, ` +
                    `expected ${r.expected}.`);
        }
        finally {
            this.endProcess();
        }
    }

    stitchData(options: StitchOptions) {
        let plan = this.loadPendingPlan();
        if (!plan)
            return;

        multi = multimeter(process);
        try {

            this.initStitchProgress();

            let cacl = new CoordsCalc(plan.center);
            let added = new Set();
            let res = [];
            let skipped = [];
            for (let index=0; index < plan.steps.length; index++) {
                pbar_stitch.ratio(index, plan.steps.length, `${index}/${plan.steps.length} files`);

                let step_file = stepFile(plan, index);
                if (!fs.existsSync(step_file)) {
                    skipped.push(step_file);
                    continue;
                }

                let list = require(step_file);
                list.forEach(i => {
                    if (!added.has(i.id)) {
                        added.add(i.id);

                        //i.distance = Number(cacl.distance(i.coordinates).toFixed(2));
                        res.push({
                            id: i.id,
                            name: i.name,
                            url: i.url.split("?")[0],
                            review_count: i.review_count,
                            price: i.price,
                            categories: extractCats(i.categories),
                            rating: i.rating,
                            coordinates: i.coordinates,
                            location: {
                                city: i.location.city,
                                zip_code: i.location.zip_code
                            },
                            display_phone: i.display_phone
                        });
                    }
                });
            }

            pbar_stitch.percent(100, "                        ");

            let compressed = pako.deflate(JSON.stringify(res));
            let tgt = (options.targetDir) ?
                path.join(options.targetDir, path.basename(files.yelp_data)) :
                files.yelp_data;

            let tgt_comp = (options.targetDir) ?
                path.join(options.targetDir, path.basename(files.compressed_yelp_data)) :
                files.compressed_yelp_data;

            fs.writeFileSync(tgt, JSON.stringify(res, null, 2), "utf8");
            fs.writeFileSync(tgt_comp, compressed);
            console.log(`[+] Stitching process completed, data was saved to "${path.resolve(tgt)}".`);

            if (skipped.length)
                skipped.forEach(sf => {
                    console.log(`[*] Step file "${sf}" was skipped, the data file does not exist.`);
                });
        }
        finally {
            this.endProcess();
        }


        //

        function extractCats(cats) {
            let res = [];
            cats.forEach(c => res.push(c.title));

            return res;
        }
    }


    //


    private async search(filters: YelpFilters) : Promise<any> {
        if (!this.client)
            this.client = yelp.client(yelp_api_key);

        if (!filters.limit)
            filters.limit = 1;

        let stime = Date.now();
        let res = await this.client.search(filters);
        this.query_count++;
        this.total_query_time += Date.now() - stime;

        return res;
    }

    private initExecProgress() {
        console.log();

        let title = "Overall Step Progress: \n";
        multi.write(title);
        pbar_step = multi.rel(title.length, 2, {
            width: 40,
            solid: { text: "*", foreground: "green" },
            empty: { text: " " }
        });

        title = "Current Step Progress: \n";
        multi.write(title);
        pbar_page = multi.rel(title.length, 0, {
            width: 40,
            solid: { text: "*", foreground: "yellow" },
            empty: { text: " " }
        });
    }

    private initStitchProgress() {
        let title = "Stitching Progress:    \n";
        multi.write(title);
        pbar_stitch = multi.rel(title.length, 0, {
            width: 40,
            solid: { text: "*", foreground: "magenta" },
            empty: { text: " " }
        });
    }

    private savePlan(plan: ExecPlan) {
        fs.writeFileSync(files.running_plan, JSON.stringify(plan, null, 2), "utf8");
    }

    private loadPendingPlan() : ExecPlan {
        if (fs.existsSync(files.running_plan)) {
            let plan = JSON.parse(fs.readFileSync(files.running_plan, "utf8"));
            console.log(`[+] Found pending plan with ${plan.steps.length}, steps ` +
                `remaining: ${plan.steps.length - plan.cur_step}`);
            return plan;
        }
        else {
            console.log(`[*] There is no pending plan to execute.`);
            console.log(`    >> Use "node importer.js plan [options]" to generate a plan.`);
            return null;
        }

    }

    private endProcess() {
        if (!multi)
            return;

        multi.destroy();
        multi = null;
    }

}


//

function sleep(t: number) : Promise<any> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, t);
    });
}

function expandSearch(center: Coords, radius: number) : Coords[] {
    const max_long_ratio = 69.172;
    const lat_ratio = 69;
    const long_ratio = rads(center.latitude) * max_long_ratio;


    let long_inc = radius / long_ratio;
    let lat_inc = radius / lat_ratio;

    return [
        { latitude: center.latitude - lat_inc, longitude: center.longitude - long_inc,
            top: center.top + -lat_inc * lat_ratio, left: center.left + -long_inc * long_ratio },
        { latitude: center.latitude - lat_inc, longitude: center.longitude + long_inc,
            top: center.top + -lat_inc * lat_ratio, left: center.left + long_inc * long_ratio },
        { latitude: center.latitude + lat_inc, longitude: center.longitude - long_inc,
            top: center.top + lat_inc * lat_ratio, left: center.left + -long_inc * long_ratio },
        { latitude: center.latitude + lat_inc, longitude: center.longitude + long_inc,
            top: center.top + lat_inc * lat_ratio, left: center.left + long_inc * long_ratio }
    ];
}


function rads(angle: number) : number {
    const pi = 3.14159265359;
    return angle * pi / 180;
}