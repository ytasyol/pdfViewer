import scrolltrap from 'scrolltrap';
import Page from './page';

const CancelablePromise = class CancelablePromise {
  constructor(promise) {
    this.canceled = false;
    this._promise = promise;
  }

  get promise() {
    return new Promise((resolve, reject) => {
      this._promise
        .then((data) => {
          if (this.canceled) {
            reject('CANCELED');
          } else {
            resolve(data);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  cancel() {
    this.canceled = true;
  }
}

const loadPrev = function () {
  const firstPage = this.renderedPages[0];
  const pdf = this.pdfs.find((p) => p.footprint === firstPage.footprint);
  if (firstPage && pdf) {
    if (firstPage.pageNumber > 1) {
      pdf.getPage(firstPage.pageNumber - 1)
        .then((page) => {
          const p = new Page(page, document.getElementById(this.pagesContainerId), pdf.footprint);
          p.render(this.width, this.height);
          this.renderedPages.unshift(p);
          const removedPage = this.renderedPages.pop();
          removedPage.destroy();
        });
    } else {
      const loadPdf = new CancelablePromise(pdfjsLib.getDocument(pdf.url));
      loadPdf.promise
        .then((pdf) => {
          this.pdfs.push(pdf);
          pdf.getPage(pdf.numPages)
            .then((page) => {
              const p = new Page(page, document.getElementById(this.pagesContainerId), pdf.footprint);
              p.render(this.width, this.height);
              this.renderedPages.unshift(p);
              const removedPage = this.renderedPages.pop();
              removedPage.destroy();
            });
        });
    }
  } else {
    //TODO
  }
}

const loadNext = function () {
  const lastPage = this.renderedPages[this.renderedPages.length - 1];
  const pdf = this.pdfs.find((p) => p.footprint === lastPage.footprint);
  if (lastPage && pdf) {
    if (lastPage.pageNumber < pdf.numPages) {
      pdf.getPage(lastPage.pageNumber + 1)
        .then((page) => {
          const p = new Page(page, document.getElementById(this.pagesContainerId), pdf.footprint);
          p.render(this.width, this.height);
          this.renderedPages.push(p);
          // const removedPage = this.renderedPages.shift();
          // removedPage.destroy();
        });
    } else {
      this.getNext((data) => {
        const loadPdf = new CancelablePromise(pdfjsLib.getDocument(data.url));
        loadPdf.promise
          .then((pdf) => {
            this.pdfs.push(pdf);
            pdf.getPage(1)
              .then((page) => {
                const p = new Page(page, document.getElementById(this.pagesContainerId), pdf.footprint);
                p.render(this.width, this.height);
                this.renderedPages.unshift(p);
                const removedPage = this.renderedPages.pop();
                removedPage.destroy();
              });
          });
      });
    }
  } else {
    //TODO
  }
}

const setScrollHandling = function (trapElement) {
  trapElement.focus();
  trapElement.addEventListener('mouseenter', (e) => {
    this.trapToken = scrolltrap.attach(trapElement)
  });

  trapElement.addEventListener('mouseleave', (e) => {
    scrolltrap.destroy(this.trapToken);
  });

  trapElement.addEventListener('scroll', (e) => {
    const scrollTop = e.target.scrollTop;
    const scrollHeight = e.target.scrollHeight;
    const scrollBottom = e.target.offsetHeight + scrollTop;

    if (scrollTop <= this.loadOffset && this.lastScrollTop > scrollTop) {
      console.log("Get Prev");
      //loadPrev.bind(this)();
    }

    if (scrollBottom >= (scrollHeight - this.loadOffset) && this.lastScrollTop < scrollTop) {
      console.log("Get Next");
      loadNext.bind(this)();
    }
    this.lastScrollTop = e.target.scrollTop;
  });
}

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
    this.trapToken = undefined;
    this.lastScrollTop = 0;
    this.loadOffset = 0;
    this.offsetMultiplier = 0;
    this.pdfs = [];
    this.renderedPages = [];
    this.isLoading = false;

    this.getPrev = () => undefined;
    this.getNext = () => undefined;

    createPdfViewer.bind(this)();
    setScrollHandling.bind(this)(document.getElementById(this.viewerId));
  }

  set pdf(pdf) {
    const loadPdf = new CancelablePromise(pdfjsLib.getDocument(pdf.url));
    loadPdf.promise
      .then((pdf) => {
        this.pdfs = [pdf];
        for (let i = 1; i < pdf.numPages && i <= 2; i++) {
          pdf.getPage(i)
            .then((page) => {
              const p = new Page(page, document.getElementById(this.pagesContainerId), pdf.footprint);
              const renderTask = p.render(this.width, this.height);
              if (p.pageNumber === 1) {
                renderTask
                  .then(() => {
                    this.loadOffset = p.pageHeight * this.offsetMultiplier;
                  });
              }
              this.renderedPages.push(p);
            });

        }
      }, (error) => {
        console.error(error);
      }
      );
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const page of this.renderedPages) {
      page.render(width, height);
    }
    if (this.renderedPages.length) {
      this.loadOffset = this.renderedPages[0].pageHeight * this.offsetMultiplier;
    }
  }

  destroy() {
    //TODO
  }
}