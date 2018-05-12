
import Viewer from './viewer';

(function(ns) {
    const viewer = new Viewer('default', document.getElementById('container'), 400, 600);
    viewer.pdf = {
        title: 'Title',
        url: 'compressed.tracemonkey-pldi-09.pdf'
    };

    viewer.getNext = function(cb) {
        cb({
            title: 'Title',
            url: 'compressed.tracemonkey-pldi-09.pdf'
        });
    }

    viewer.getPrev = function(cb) {
        cb({
            title: 'Title',
            url: 'compressed.tracemonkey-pldi-09.pdf'
        });
    }
})();