
import Viewer from './viewer';

(function(ns) {
    const viewer = new Viewer('default', document.getElementById('container'), 400, 600);
    viewer.pdf = {
        title: 'Title',
        url: 'compressed.tracemonkey-pldi-09.pdf'
    };
})();