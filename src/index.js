
import Viewer from './viewer';

(function(ns) {
    let viewer = new Viewer('default', document.getElementById('container'), 400, 600);
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

    document.getElementById("resetBtn").addEventListener("click", function(){
        viewer.pdf = {
            title: 'Title',
            url: 'compressed.tracemonkey-pldi-09.pdf'
        };
    });
    document.getElementById("removeBtn").addEventListener("click", function(){
        viewer.destroy();
    });
    document.getElementById("createBtn").addEventListener("click", function(){
        viewer = new Viewer('default', document.getElementById('container'), 400, 600);
        viewer.pdf = {
            title: 'Title',
            url: 'compressed.tracemonkey-pldi-09.pdf'
        };
    });
})();