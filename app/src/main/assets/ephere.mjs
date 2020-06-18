/* ephere.mjs */
const log = console.log;

const PI = Math.PI,
    PI2 = 2 * PI,
    floor = Math.floor,
    sin = Math.sin,
    asin = Math.asin,
    cos = Math.cos,
    acos = Math.acos,
    tan = Math.tan,
    atan = Math.atan,
    atan2 = Math.atan2,
    sqrt = Math.sqrt,
    trunc = Math.trunc,
    round = Math.round,
    abs = Math.abs,
    pow = Math.pow,
    deg = 180 / PI,
    rad = PI / 180;
const J2000 = 2451545;
const JDTT = (y, m, d, hh = 0, mm = 0, ss = 0) => { return 2440587.5 + Date.UTC(y, m - 1, d, hh, mm, ss) / 86400000; }

const epsilon = (t) => {
    t /= 100;
    //const t = T(jd) / 100;
    return rad * (84381.448 + t * (-4680.93 + t * (-1.55 + t * (1999.25 + t * (-51.38 + t * (-249.67 +
        t * (-39.05 + t * (7.12 + t * (27.87 + t * (5.79 + t * 2.45)))))))))) / 3600;
}

export const JD = (y, m, d) => {
    y -= (m < 3) ? 1 : 0;
    m += (m < 3) ? 12 : 0;
    const A = ((y / 100) | 0)
    const B = 2 - A + ((A / 4) | 0)
    return ((365.25 * (y + 4716)) | 0) + ((30.6001 * (m + 1)) | 0) + d + B - 1524.5;
}

const frac = (x) => { return x % 1; }
export const range = (x, max = 360, min = 0) => {
    return ((max - min) * frac(x / (max - min)))
        + ((max - min) * frac(x / (max - min)) < min) * (max - min)
        - ((max - min) * frac(x / (max - min)) > max) * (max - min);
}

export const hhmm = (hhdec) => { return [String(trunc(hhdec)).padStart(2, 0), String(round(hhdec % 1 / (1 / 60))).padStart(2, 0)]; }
const hhmmss = (hhdec) => { return [trunc(hhdec), floor(hhdec % 1 / (1 / 60)), (hhdec % 1 / (1 / 60)) % 1 / (1 / 60)]; }

const T = (jd) => { return (jd - 2451545) / 36525; }
const GMST0 = (jd) => { const t = T(jd); return (24110.54841 + 8640184.812866 * t + 0.093104 * t * t - 0.0000062 * t * t * t) % 86400; }
const GMST = (jd, hh) => { return (GMST0(jd) + 1.00273790935 * (hh * 3600)) % 86400; }
const ST = (jd, hh, londeg) => { return (GMST(jd, hh) + ((londeg * 3600) / 15)) % 86400; }



class CelestialObject {

    local_sidereal_time(jd, hh, lon) {
        const d = jd - 2451545 + hh / 24;
        const t = T(jd);
        const lst = range(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - t * t * t / 38710000);
        return (lst / 15.0 + lon / 15);
    }

    sidereal_time(jd, lon) { // theta
        return (280.1470 + 360.9856235 * (jd - J2000) - (-lon)) % 360
    }

    sun_mean_anomaly(jd) { // M (sun)
        return (357.5291 + 0.98560028 * (jd - J2000)) % 360;
    }

    argument_of_perihelion(jd) { // w (sun)
        return (282.9404 + 4.70935E-5 * (jd - J2000)) % 360;
    }

    local_hour_angle(jd, UT, lon) { // LHA (sun)
        const t = T(jd);
        const pos = this.equatorial_coordinates(jd);
        const Ms = this.sun_mean_anomaly(jd)
        const ws = this.argument_of_perihelion(jd)
        const L = Ms + ws
        const xGMST0 = L + 180;
        let LST = xGMST0 + UT * 24 * 15.0 + lon;
        return LST - pos.ra * 15;
    }

    altitude_sine(jd, hh, lat, londeg) {
        const st = this.local_sidereal_time(jd, hh, londeg);
        const sglat = sin(rad * lat);
        const cglat = cos(rad * lat);
        const t = T(jd + hh / 24);
        const coords = this.equatorial_coordinates(jd + hh / 24)
        const tau = 15 * (st - coords.ra);
        return sglat * sin(rad * coords.dec) + cglat * cos(rad * coords.dec) * cos(rad * tau);
    }

    azimuth(H, lat, dec) {
        return atan2(-sin(H * rad) * cos(dec * rad),
            cos(lat * rad) * sin(dec * rad)
            - sin(lat * rad) * cos(dec * rad) * cos(H * rad));
    }

    altitude(H, lat, dec) {
        return asin(sin(lat * rad) * sin(dec * rad)
            + cos(lat * rad) * cos(dec * rad) * cos(H * rad));
    }

    times(jd, tz, lat, lon, h0 = -0.833) {

        const result = {
            rise: null,
            set: null,
            above: null
        }

        let hh = 1;

        let ym = this.altitude_sine(jd - tz / 24, hh - 1, lat, lon) - sin(rad * h0);
        if (ym > 0.0) result.above = true;

        while (hh < 25 && (result.rise === null || result.set === null)) {
            let yz = this.altitude_sine(jd - tz / 24, hh, lat, lon) - sin(rad * h0);
            let yp = this.altitude_sine(jd - tz / 24, hh + 1, lat, lon) - sin(rad * h0);

            let nz = 0, z1 = 0, z2 = 0;
            const a = 0.5 * (ym + yp) - yz;
            const b = 0.5 * (yp - ym);
            const c = yz;
            const xe = -b / (2 * a);
            const ye = (a * xe + b) * xe + c;
            const dis = b * b - 4.0 * a * c;
            if (dis > 0) {
                const dx = 0.5 * Math.sqrt(dis) / Math.abs(a);
                z1 = xe - dx;
                z2 = xe + dx;
                if (abs(z1) <= 1.0) nz += 1;
                if (abs(z2) <= 1.0) nz += 1;
                if (z1 < -1.0) z1 = z2;
            }

            // case when one event is found in the interval
            if (nz == 1) {
                if (ym < 0.0) {
                    result.rise = hh + z1;
                }
                else {
                    result.set = hh + z1;
                }
            } // end of nz = 1 case

            // case where two events are found in this interval
            // (rare but whole reason we are not using simple iteration)
            if (nz == 2) {
                if (ye < 0.0) {
                    result.rise = hh + z2;
                    result.set = hh + z1;
                }
                else {
                    result.rise = hh + z1;
                    result.set = hh + z2;
                }
            } // end of nz = 2 case

            ym = yp;
            hh += 2.0;
        }

        if (null === (result.rise && result.set)) {
            result.above = (result.above !== null)
        }

        return result;
    }
}

export class Sun extends CelestialObject {

    equatorial_coordinates(jd) {
        const t = T(jd)
        const coseps = cos(epsilon(t)), sineps = sin(epsilon(t));

        const M = PI2 * frac(0.993133 + 99.997361 * t);
        const DL = 6893.0 * Math.sin(M) + 72.0 * Math.sin(2 * M);
        const L = PI2 * frac(0.7859453 + M / PI2 + (6191.2 * t + DL) / 1296000);
        const SL = Math.sin(L);
        const X = Math.cos(L);
        const Y = coseps * SL;
        const Z = sineps * SL;
        const RHO = Math.sqrt(1 - Z * Z);
        const dec = (360.0 / PI2) * Math.atan(Z / RHO);
        let ra = (48.0 / PI2) * Math.atan(Y / (X + RHO));
        if (ra < 0) ra += 24;

        return {
            dec: dec,
            ra: ra,
            L: L,
            M: M
        };
    }
}

export class Moon extends CelestialObject {

    equatorial_coordinates(jd) {
        const t = T(jd)
        const coseps = cos(epsilon(t)), sineps = sin(epsilon(t));
        var p2 = PI2, arc = 206264.8062;
        var L0, L, LS, F, D, H, S, N, DL, CB, L_moon, B_moon, V, W, X, Y, Z, RHO;


        L0 = frac(0.606433 + 1336.855225 * t);	// mean longitude of moon
        L = p2 * frac(0.374897 + 1325.552410 * t) //mean anomaly of Moon
        LS = p2 * frac(0.993133 + 99.997361 * t); //mean anomaly of Sun
        D = p2 * frac(0.827361 + 1236.853086 * t); //difference in longitude of moon and sun
        F = p2 * frac(0.259086 + 1342.227825 * t); //mean argument of latitude

        // corrections to mean longitude in arcsec
        DL = 22640 * Math.sin(L)
        DL += -4586 * Math.sin(L - 2 * D);
        DL += +2370 * Math.sin(2 * D);
        DL += +769 * Math.sin(2 * L);
        DL += -668 * Math.sin(LS);
        DL += -412 * Math.sin(2 * F);
        DL += -212 * Math.sin(2 * L - 2 * D);
        DL += -206 * Math.sin(L + LS - 2 * D);
        DL += +192 * Math.sin(L + 2 * D);
        DL += -165 * Math.sin(LS - 2 * D);
        DL += -125 * Math.sin(D);
        DL += -110 * Math.sin(L + LS);
        DL += +148 * Math.sin(L - LS);
        DL += -55 * Math.sin(2 * F - 2 * D);

        // simplified form of the latitude terms
        S = F + (DL + 412 * Math.sin(2 * F) + 541 * Math.sin(LS)) / arc;
        H = F - 2 * D;
        N = -526 * Math.sin(H);
        N += +44 * Math.sin(L + H);
        N += -31 * Math.sin(-L + H);
        N += -23 * Math.sin(LS + H);
        N += +11 * Math.sin(-LS + H);
        N += -25 * Math.sin(-2 * L + F);
        N += +21 * Math.sin(-L + F);

        // ecliptic long and lat of Moon in rads
        L_moon = p2 * frac(L0 + DL / 1296000);
        B_moon = (18520.0 * Math.sin(S) + N) / arc;

        // equatorial coord conversion - note fixed obliquity
        CB = Math.cos(B_moon);
        X = CB * Math.cos(L_moon);
        V = CB * Math.sin(L_moon);
        W = Math.sin(B_moon);
        Y = coseps * V - sineps * W;
        Z = sineps * V + coseps * W
        RHO = Math.sqrt(1.0 - Z * Z);
        let dec = (360.0 / p2) * Math.atan(Z / RHO);
        let ra = (48.0 / p2) * Math.atan(Y / (X + RHO));
        if (ra < 0) ra += 24;

        // https://viewer.mathworks.com/?viewer=plain_code&url=https%3A%2F%2Fde.mathworks.com%2Fmatlabcentral%2Fmlc-downloads%2Fdownloads%2Fd4a17bd3-5583-4352-b8a9-5da8fd036d3b%2Ff68cc33b-2aa9-4a7d-8230-4c11d35eb940%2Ffiles%2FMoon%20Position%2FMoon.m&embed=web
        let R = 385000e3 - 20905e3 * cos(L) - 3699e3 * cos(2 * D - L) - 2956e3 * cos(2 * D)
            - 570e3 * cos(2 * L) + 246e3 * cos(2 * L - 2 * D) - 205e3 * cos(LS - 2 * D)
            - 171e3 * cos(L + 2 * D) - 152e3 * cos(L + LS - 2 * D);
        return {
            ra: ra,
            dec: dec,
            r: R
        }
    }
}

export const query = (jd, tz, lat, lon) => {
    const sun = new Sun();
    let sun_data = sun.times(jd, tz, lat, lon);
    // sun_data.al = 
    // sun_data.az = 
    const moon = new Moon();
    let moon_data = moon.times(jd, tz, lat, lon);

    return {
        sun: sun_data,
        moon: moon_data
    }
}

