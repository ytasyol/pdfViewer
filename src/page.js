
export default class Page {
    constructor(page, footprint, container, insertTop) {
        this._page = page;
        this._pdfFootprint = footprint;
        this._height = 0;
        this._canvas = document.createElement('canvas');
        this._canvas.style.display = 'none';
        this._renderTask = undefined;
        this._errorPage = undefined;
        if(insertTop) {
            container.insertBefore(this._canvas, container.childNodes[0]);
        } else {
            container.appendChild(this._canvas);
        }
    }

    get pageHeight() {
        return this._height;
    }

    get footprint() {
        return this._pdfFootprint;
    }

    get pageNumber() {
        return this._page.pageIndex + 1;
    }

    render(width, height) {     
        var context = this._canvas.getContext('2d');

        var viewport = this._page.getViewport(1);
        var scale = (width - 22) / viewport.width;
        var scaledViewport = this._page.getViewport(scale);

        this.height = scaledViewport.height;
        this._canvas.height = scaledViewport.height;
        this._canvas.width = scaledViewport.width;

        var renderContext = {
        canvasContext: context,
        viewport: scaledViewport
        };
        this._renderTask = this._page.render(renderContext);
        this._renderTask
            .then(() => {
                this._canvas.style.display = 'block';
            })
            .catch((error) => {
                this._errorPage = document.createElement('div');
                this._errorPage.classList.add('errorPage');
                this._errorPage.textContent = `Page ${ this.pageNumber } Error: ${error}`;
                this._canvas.parentNode.replaceChild(this._errorPage, this._canvas);
            });
        return this._renderTask;
    }

    destroy() {
        this._page.cleanup();
        if(this._canvas) this._canvas.remove();
        if(this._errorPage) this._errorPage.remove();
    }
}