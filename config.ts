const fs = require("fs");
const path = require("path");
const os = require("os");


const def_location_map = {
    home: { latitude: 34.176455, longitude: -118.5404983 }
};


export const config_dir = path.join(os.homedir(), ".cg-yelp");
export const data_dir = path.join(config_dir, "data");

if (!fs.existsSync(config_dir))
    fs.mkdirSync(config_dir);

if (!fs.existsSync(data_dir))
    fs.mkdirSync(data_dir);

export const files = {
    location_map: path.join(config_dir, "location_map.json"),
    running_plan: path.join(config_dir, "running_plan.json"),
    yelp_data: path.join(config_dir, "yelp_data.json"),
    compressed_yelp_data: path.join(config_dir, "yelp_data_compressed.bin"),
    categories: path.join(config_dir, "new_categories.json"),
};


if (!fs.existsSync(files.location_map))
    fs.writeFileSync(files.location_map, JSON.stringify(def_location_map, null, 2), "utf8");

if (!fs.existsSync(files.yelp_data))
    fs.copyFileSync(path.join(__dirname, "yelp_data.json"), files.yelp_data);

