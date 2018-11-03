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
const yelp_data_1 = require("../yelp-data");
let data = new yelp_data_1.YelpData();
(() => __awaiter(this, void 0, void 0, function* () {
    let res = yield data.query({ rating: 5, distance: 2 }, yelp_data_1.SortField.review_count);
    console.log(res);
}))();
//# sourceMappingURL=demo.js.map