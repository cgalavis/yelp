"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const os = require("os");
const def_location_map = {
    home: { latitude: 34.176455, longitude: -118.5404983 }
};
exports.config_dir = path.join(os.homedir(), ".cg-yelp");
exports.data_dir = path.join(exports.config_dir, "data");
if (!fs.existsSync(exports.config_dir))
    fs.mkdirSync(exports.config_dir);
if (!fs.existsSync(exports.data_dir))
    fs.mkdirSync(exports.data_dir);
exports.files = {
    location_map: path.join(exports.config_dir, "location_map.json"),
    running_plan: path.join(exports.config_dir, "running_plan.json"),
    yelp_data: path.join(exports.config_dir, "yelp_data.json"),
    compressed_yelp_data: path.join(exports.config_dir, "yelp_data_compressed.bin"),
    categories: path.join(exports.config_dir, "new_categories.json"),
};
if (!fs.existsSync(exports.files.location_map))
    fs.writeFileSync(exports.files.location_map, JSON.stringify(def_location_map, null, 2), "utf8");
if (!fs.existsSync(exports.files.yelp_data))
    fs.copyFileSync(path.join(__dirname, "yelp_data.json"), exports.files.yelp_data);
//# sourceMappingURL=config.js.map