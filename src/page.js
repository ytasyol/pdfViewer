
export default class Page {
    constructor(page, pagesContainer, footprint) {
        this.page = page;
        this.pdfFootprint = footprint;
        this.height = 0;
        this.canvas = document.createElement('canvas');
        pagesContainer.appendChild(this.canvas);
    }

    get pageHeight() {
        return this.height;
    }

    get footprint() {
        return this.pdfFootprint;
    }

    get pageNumber() {
        return this.page.pageIndex + 1;
    }

    render(width, height) {     
        var context = this.canvas.getContext('2d');

        var viewport = this.page.getViewport(1);
        var scale = (width - 22) / viewport.width;
        var scaledViewport = this.page.getViewport(scale);

        this.height = scaledViewport.height;
        this.canvas.height = scaledViewport.height;
        this.canvas.width = scaledViewport.width;

        var renderContext = {
        canvasContext: context,
        viewport: scaledViewport
        };
        return this.page.render(renderContext);
    }

    destroy() {
        this.page.cleanup();
        this.canvas.remove();
    }
}