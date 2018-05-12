
const createPdfViewer = function () {
  this.parentElement.innerHTML = `
        <div id="${this.viewerContainerId}" class="pdfContainer" style="width: ${this.width}px; height: ${this.height};">
            <div id="${this.viewerId}" class="pdfViewer" style="width: ${this.width + 16}px; height: ${this.height};">
                <div id="${this.pagesContainerId}">
                </div>
            <div>
        </div>`;
}

export default class Viewer {
  constructor(id, parentElement, width, height) {
    this.id = id;
    this.parentElement = parentElement;
    this.width = width;
    this.height = height;

    this.viewerContainerId = `container_${this.id}`;
    this.viewerId = `viewer_${this.id}`;
    this.pagesContainerId = `pages_container_${this.id}`;

    createPdfViewer.bind(this)();
  }

  set pdf(pdf) {
    console.log(pdf);
    pdfjsLib.getDocument(pdf.url)
      .then((pdf) => {
        for (let i = 1; i < pdf.numPages; i++) {
          pdf.getPage(i)
            .then((page) => {
              var canvas = document.createElement('canvas');
              document.getElementById(this.pagesContainerId).appendChild(canvas);
              var context = canvas.getContext('2d');

              var viewport = page.getViewport(1);
              var scale = (this.width - 22) / viewport.width;
              var scaledViewport = page.getViewport(scale);

              canvas.height = scaledViewport.height;
              canvas.width = scaledViewport.width;

              var renderContext = {
                canvasContext: context,
                viewport: scaledViewport
              };
              page.render(renderContext);
            });

        }
      }, (error) => {
        console.error(error);
      }
      );
  }

  resize(width, height) {

  }

  destroy() {

  }
}