import {SortField, YelpData} from "../yelp-data";

let data = new YelpData();

(async () => {
    let res = await data.query({ rating: 5, distance: 2 }, SortField.review_count);
    console.log(res);
})();
