'use strict';

const fs = require('fs');

exports.watch = function(path, onChange) {
    let watcher = fs.watch(path, { recursive: false }, (eventType, filename) => {
        if (filename) {
            console.log(filename);
            if (eventType === 'rename') {
                //add + rename + remove file
            } else if (eventType === 'change') {
                //update content file
            }
            onChange(filename);
        }
    });
}