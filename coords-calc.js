"use strict";

const geocoding = require('geocoding');
const goog_api_key = "AIzaSyDG1EhOc5IGNk0Qs-0a5j8ti_6fYinjknE";

//

module.exports = CoordsCalc;

//

const pi = 3.14159265359;

function rads(angle) {
    return angle * pi / 180;
}

function CoordsCalc(coords) {
    this.latitude = coords.latitude;
    this.longitude = coords.longitude;
}

CoordsCalc.prototype.distance = function(coords) {
    const R = 6371e3; // metres

    let rlat1 = rads(this.latitude);
    let rlat2 = rads(coords.latitude);

    let delta_rlat = rads(coords.latitude - this.latitude);
    let delta_rlong = rads(coords.longitude - this.longitude);

    let a = Math.sin(delta_rlat / 2) * Math.sin(delta_rlat / 2) +
        Math.cos(rlat1) * Math.cos(rlat2) *
        Math.sin(delta_rlong / 2) * Math.sin(delta_rlong / 2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return c * R * 0.00062137;
};

CoordsCalc.getCoords = async function (location) {
    let res = await geocoding({ key: goog_api_key, address: location });
    if (res.length) {
        return {
            latitude: res[0].geometry.location.lat,
            longitude: res[0].geometry.location.lng,
        };
    }

    return null;
};
