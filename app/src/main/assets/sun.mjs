// Copyright (C) 2020 Stephan Cieszynski
// 
// This file is part of EPHERE.MJS.
// 
// EPHERE.MJS is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// EPHERE.MJS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with EPHERE.MJS.  If not, see <http://www.gnu.org/licenses/>.

/* sun.mjs */
import { CelestialObject } from './ephere.mjs'

export default class Sun extends CelestialObject {

    h0 = -0.833;

    xyz = (t, origin) => {
        return [0, 0, 0].map((n, i) => n - origin[i]);
    }
}