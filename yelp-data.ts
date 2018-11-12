import CoordsCalc = require("./coords-calc");

const location_map = {
    home: {
        latitude: 34.176455,
        longitude: -118.5404983
    }
};


export type Filters = {
    rating?: number;
    review_count?: number;
    distance?: number;
    price?: string;
    category?: string | string[];
}

export enum SortField {
    review_count = "review_count",
    rating = "rating",
    distance = "distance",
    price = "price"
}


export class YelpData {
    location: any;
    coords: CoordsCalc;
    data = [];
    categories: Set<string>;

    constructor(data: any[], location: any = "home") {
        this.setLocation(location);
        this.setData(data);
    }

    setLocation(location: any) {
        this.location = location;
        if (this.location in location_map)
            this.location = location_map[this.location];
    }

    setData(data: any[]) {
        this.categories = new Set();
        this.data = data.filter(biz => {
            if (biz.categories)
                biz.categories.forEach(c => this.categories.add(c));

            return !!biz.location && !!biz.coordinates;

        });
    }

    public async query(filters: Filters, sort?: SortField) {
        if ("string" === typeof this.location || "number" === typeof this.location)
            this.location = await CoordsCalc.getCoords(this.location);

        if ("string" === typeof filters.category)
            filters.category = [ filters.category ];

        this.coords = new CoordsCalc(this.location);

        let prices : string[];
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

        bs.forEach((b, i) => b._index = i);

        return bs;
    }

    //

    private static hasCategory(biz, cats: string | string[]) : boolean {
        for (let c of biz.categories) {
            for (let cat of cats)
                if (c.toLowerCase().indexOf(cat.toLowerCase()) >= 0)
                    return true;
        }

        return false;
    }
}