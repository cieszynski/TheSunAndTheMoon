'use strict';

class Sun extends CelestialObject {
    constructor() {
        super();
        this.h0 = -0.833;
    }
    

    xyz(t, origin) {
        const v = [0, 0, 0].map(function (n, i) {
            return n - origin[i]
        });

        return {
            x: v[0],
            y: v[1],
            z: v[2]
        }
    }
}