#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const table = require("@crabel/table");
const yelp_data_1 = require("../yelp-data");
const fs = require("fs");
const config_1 = require("../config");
program
    .version("1.0.0")
    .description("Query yelp for restaurants with the given criteria.")
    .option("-l,--location <LOCATION>", "Location parameter, can be a city, zip code, etc.")
    .option("-r,--rating <RATING>", "Minimum rating.")
    .option("-R,--review_count <REVIEW_COUNT>", "Minimum rating.")
    .option("-d,--distance <DISTANCE>", "Maximum distance.")
    .option("-p,--price <PRICE>", "Price levels to filer.")
    .option("-c,--category <CATEGORY>", "Items with the given category.")
    .option("--all-cats", "Print all categories.")
    .option("-s,--sort <SORT>", "Sort results by rating, review_count or distance.")
    .option("-n,--lines <LINES>", "Number of lines to display.")
    .option("-o,--offset <OFFSET>", "Number of items to skip from the beginning of the list.")
    .option("--csv", "Format output as CSV")
    .parse(process.argv);
let yelp = new yelp_data_1.YelpData(load(), program.location);
let categories = new Set();
const know_cats = [];
(() => __awaiter(this, void 0, void 0, function* () {
    let filters = {
        rating: program.rating,
        review_count: program.review_count,
        distance: program.distance,
        price: program.price,
        category: program.category
    };
    let bs = yield yelp.query(filters, program.sort);
    program.offset = +program.offset || 0;
    program.lines = +program.lines;
    if (program.lines)
        bs = bs.slice(program.offset, program.offset + program.lines);
    if (program.csv) {
        let csv = ["index,name,cats,rating,review_count,price,distance,city,zip_code,phone,url"];
        let i = 0;
        for (let b of bs) {
            let cats = [];
            b.categories.forEach(c => cats.push(c.title));
            let dist = yelp.coords.distance(b.coordinates).toFixed(2);
            csv.push(`${i++},"${b.name}","${cats.join(", ")}",${b.rating},` +
                `${b.review_count},${b.price},${dist},"${b.display_phone}","${b.location.city}",` +
                `${b.location.zip_code},${b.url}`);
        }
        console.log(csv.join("\n"));
    }
    else {
        table.log(bs, [
            "name",
            { caption: "categories",
                custom_format(v, c, d) {
                    return strCats(d);
                }, wrap: true
            },
            { caption: "rating", align: table.Align.right, decimals: 1 },
            { caption: "review_count", thousand_separator: true },
            { caption: "price", align: table.Align.right },
            { caption: "distance",
                custom_format(v, c, d) {
                    return yelp.coords.distance(d.coordinates).toFixed(2);
                }
            },
            { name: "display_phone", caption: "phone", align: table.Align.right },
            {
                caption: "city", custom_format(v, c, d) {
                    return d.location.city;
                }, align: table.Align.right
            },
            {
                caption: "zip_code", custom_format(v, c, d) {
                    return d.location.zip_code;
                }, align: table.Align.right
            },
            "url"
        ], table.renderers.grey());
        let cats = Array.from(categories);
        cats.sort((a, b) => {
            return (a < b) ? -1 : (a === b) ? 0 : 1;
        });
        fs.writeFileSync(config_1.files.categories, JSON.stringify(cats, null, 4), "utf8");
    }
}))();
//
function load(file_name) {
    if (undefined === file_name)
        file_name = config_1.files.yelp_data;
    if (!fs.existsSync(file_name))
        throw new Error(`File "${file_name}" doesn't exist.`);
    return JSON.parse(fs.readFileSync(file_name, "utf8"));
}
function strCats(item) {
    if (!item.categories || !item.categories.length)
        return "";
    if (!program.allCats)
        return item.categories[0].title;
    else {
        let res = "";
        for (let i = 0; i < item.categories.length; ++i) {
            res += item.categories[i].title + "\n";
            if (!know_cats.includes(item.categories[i].title))
                categories.add(item.categories[i].title);
        }
        return res;
    }
}
//# sourceMappingURL=query.js.map