/**
 * Desc:   Script to remove any unused palettes from harmony's scene
 * Author: Jagagish Kumar Patnala
 * Email:  jagadish123@gmail.com
 */


var max_tries = 5;
var palettes_removed = 0;

Array.prototype.indexOfObj = function (obj) {
    var found_at_index = -1;
    for (var i = 0; i < this.length; i++) {
        var _internal_obj = this[i];
        if (_internal_obj.id == obj.id) {
            found_at_index = i;
            break;
        }
    }
    return found_at_index;
}

Array.prototype.findPaletteListOf = function (palette) {
    for (var i = 0; i < this.length; i++) {
        var _item = this[i];
        if (_item["palette"].id == palette.id) {
            return PaletteObjectManager.getPaletteListById(_item["palette_list_id"]);
        }
    }
}

/**
 * Recursive function to grab all colors being used in the scene
 * @param {String[]} [colors_used]
 * @returns {String[]} colors used in scene
 */
function get_colors_used(colors_used) {
    if (typeof colors_used == "undefined") colors_used = [];
    for (var i = 0; i < element.numberOf(); i++) {
        var elem_id = element.id(i);
        for (var j = 0; j < Drawing.numberOf(elem_id); j++) {
            var drawing_id = Drawing.name(elem_id, j);
            var drawing_colors = DrawingTools.getDrawingUsedColors({ elementId: elem_id, exposure: drawing_id }) || [];
            colors_used = colors_used.concat(drawing_colors);
        }

    }
    return colors_used;
}

/**
 * Fetches all the palettes in the scene
 * @returns {Palette[]} list of palette objects
 */
function get_all_palettes() {
    var good_palettes = [];
    var bad_palettes = [];
    var palette_lists = [];
    for (var i = 0; i < PaletteObjectManager.getNumPaletteLists(); i++) {
        var palette_list = PaletteObjectManager.getPaletteListByIndex(i);
        for (var j = 0; j < palette_list.numPalettes; j++) {
            var palette = palette_list.getPaletteByIndex(j);
            if (!palette.hasOwnProperty("nColors") || !palette.hasOwnProperty("id")) {
                // if its a dirty palette delete it on detection
                try {
                    MessageLog.trace("\nFound Dirty Palette. Purging!");
                    palette_list.removePaletteById(palette.id);
                    palettes_removed++;
                } catch (err) {
                    MessageLog.trace("Error: " + err);
                }
            } else {
                if (palette.nColors == 0) {
                    if (bad_palettes.indexOfObj(palette) === -1) bad_palettes.push(palette);
                } else {
                    if (good_palettes.indexOfObj(palette) === -1) good_palettes.push(palette);
                }
                palette_lists.push({
                    "palette_list_id": palette_list.id,
                    "palette": palette
                })
            }
        }
    }
    return [good_palettes, bad_palettes, palette_lists];
}

/**
 * Attempts to delete the palette object
 * @param {paletteList} palette_list
 * @param {palette} palette
 */
function delete_palette(palette_list, palette) {
    if (!palette.hasOwnProperty("id")) {
        return false;
    }
    MessageLog.trace("Removing: " + palette.getName());
    var tries = 0;
    while (tries < max_tries) {
        try {
            // remove the palette
            if (palette_list.removePaletteById(palette.id)) {
                palettes_removed++;
                break;
            }
        } catch (err) {
            MessageLog.trace("Trying to force delete.. ");
            palette_list.releaseLock();
            if (palette_list.removePaletteById(palette.id)) {
                palettes_removed++;
                break;
            } else {
                tries++;
            }
        }
    }
    MessageLog.trace("Removed in: " + tries + " attempts.");
}

/**
 * Attemps to remove unused and zero colors palettes from the color view by
 * collecting all the palettes and colors in the scene and checking which color 
 * from a palette are used.
 */
function bbf_clean_palettes() {
    var colors_used = get_colors_used();
    var all_palettes = get_all_palettes();
    var bad_palettes = all_palettes[1];
    var good_palettes = all_palettes[0];
    var palette_lists = all_palettes[2];
    // Gather information
    for (var i = 0; i < good_palettes.length; i++) {
        // verify if this palette is in use by checking if any of its 
        // colors are being used.
        var _palette = good_palettes[i];
        var colors_in_use = 0;
        // get all colors in the palette
        var colors_in_palette = [];
        for (var j = 0; j < _palette.nColors; j++) {
            colors_in_palette.push(_palette.getColorByIndex(j));
        }
        // check if any of the colors from this palette are being used
        for (var k = 0; k < colors_in_palette.length; k++) {
            var _color = colors_in_palette[k];
            if (colors_used.indexOf(_color.id) != -1) {
                colors_in_use += 1;
            }
        }
        if (!colors_in_use) {
            good_palettes.pop(good_palettes.indexOf(_palette));
            bad_palettes.push(_palette);
        }
    }
    // delete the bad palettes
    for (var i = 0; i < bad_palettes.length; i++) {
        try {
            delete_palette(palette_lists.findPaletteListOf(bad_palettes[i]), bad_palettes[i]);
        } catch (err) {
            MessageLog.trace("Cannot delete: " + err);
        }
    }
    MessageLog.trace("Unused Palettes Deleted: " + palettes_removed);
}


/**
try {
    include("bbf_PaletteCleaner.js");
    bbf_clean_palettes();
} catch (err) {
    MessageLog.trace("Err: " + err);
}
*/