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
const CoordsCalc = require("./coords-calc");
const location_map = {
    home: {
        latitude: 34.176455,
        longitude: -118.5404983
    }
};
var SortField;
(function (SortField) {
    SortField["review_count"] = "review_count";
    SortField["rating"] = "rating";
    SortField["distance"] = "distance";
    SortField["price"] = "price";
})(SortField = exports.SortField || (exports.SortField = {}));
class YelpData {
    constructor(data, location = "home") {
        this.data = [];
        this.setLocation(location);
        this.setData(data);
    }
    setLocation(location) {
        this.location = location;
        if (this.location in location_map)
            this.location = location_map[this.location];
    }
    setData(data) {
        this.categories = new Set();
        this.data = data.filter(biz => {
            if (biz.categories)
                biz.categories.forEach(c => this.categories.add(c.title));
            return !!biz.location && !!biz.coordinates;
        });
    }
    query(filters, sort) {
        return __awaiter(this, void 0, void 0, function* () {
            if ("string" === typeof this.location || "number" === typeof this.location)
                this.location = yield CoordsCalc.getCoords(this.location);
            if ("string" === typeof filters.category)
                filters.category = [filters.category];
            this.coords = new CoordsCalc(this.location);
            let prices;
            if (undefined !== filters.price)
                prices = filters.price.split(",").map(p => p.trim());
            // Filter Results
            let bs = this.data.filter((biz) => {
                return ((!filters.review_count || biz.review_count >= filters.review_count)
                    && (!filters.rating || Number(biz.rating) >= filters.rating)
                    && (!filters.distance || this.coords.distance(biz.coordinates) <= filters.distance))
                    && (!prices || filters.price.includes(biz.price))
                    && (!filters.category || !filters.category.length || YelpData.hasCategory(biz, filters.category));
            });
            // Sort Results
            if (sort) {
                if (SortField.distance === sort)
                    bs.sort((a, b) => {
                        return this.coords.distance(a.coordinates) < this.coords.distance(b.coordinates) ? -1 : 1;
                    });
                else if (sort) {
                    if (SortField.rating === sort)
                        bs.sort((a, b) => {
                            if (a.rating === b.rating)
                                return a.review_count < b.review_count ? 1 : -1;
                            return a.rating < b.rating ? 1 : -1;
                        });
                    else
                        bs.sort((a, b) => {
                            return a[sort] < b[sort] ? 1 : -1;
                        });
                }
            }
            return bs;
        });
    }
    //
    static hasCategory(biz, cats) {
        for (let c of biz.categories) {
            for (let cat of cats)
                if (c.title.toLowerCase().indexOf(cat.toLowerCase()) >= 0)
                    return true;
        }
        return false;
    }
}
exports.YelpData = YelpData;
//# sourceMappingURL=yelp-data.js.map