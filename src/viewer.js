import scrolltrap from 'scrolltrap';
import Page from './page';

const CancelablePromise = class CancelablePromise {
  constructor(promise) {
    this._canceled = false;
    this._promise = promise;
  }

  get promise() {
    return new Promise((resolve, reject) => {
      this._promise
        .then((data) => {
          if (this._canceled) {
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
    this._canceled = true;
  }
}

const loadPrev = function () {
  const firstPage = this._renderedPages[0];
  const pdf = this._pdfs.find((p) => p.footprint === firstPage.footprint);
  if (firstPage && pdf && !this._isLoading) {
    this._isLoading = true;
    if (firstPage.pageNumber > 1) {
      pdf.getPage(firstPage.pageNumber - 1)
        .then((page) => {
          const p = new Page(page, pdf.footprint, document.getElementById(this.pagesContainerId), true);
          p.render(this._width, this._height);
          this.renderedPages.unshift(p);
          // const removedPage = this.renderedPages.pop();
          // removedPage.destroy();
          this._isLoading = false;
        });
    } else {
      this.getPrev((prev) => {
        if (prev) {
          const loadPdf = new CancelablePromise(pdfjsLib.getDocument(prev.url));
          loadPdf.promise
            .then((pdf) => {
              this._pdfs.push(pdf);
              pdf.getPage(pdf.numPages)
                .then((page) => {
                  const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId), true);
                  p.render(this._width, this._height);
                  this._renderedPages.unshift(p);
                  // const removedPage = this.renderedPages.pop();
                  // removedPage.destroy();
                  this._isLoading = false;
                });
            });
        } else {
          //nothing more
        }
      });
    }
  } else {
    //error no pdf / lastPage
  }
}

const loadNext = function () {
  const lastPage = this._renderedPages[this._renderedPages.length - 1];
  const pdf = this._pdfs.find((p) => p.footprint === lastPage.footprint);
  if (lastPage && pdf && !this._isLoading) {
    this._isLoading = true;
    if (lastPage.pageNumber < pdf.numPages) {
      pdf.getPage(lastPage.pageNumber + 1)
        .then((page) => {
          const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
          p.render(this._width, this._height);
          this.renderedPages.push(p);
          // const removedPage = this.renderedPages.shift();
          // removedPage.destroy();
          this._isLoading = false;
        });
    } else {
      this.getNext((data) => {
        const loadPdf = new CancelablePromise(pdfjsLib.getDocument(data.url));
        loadPdf.promise
          .then((pdf) => {
            if (pdf) {
              this._pdfs.push(pdf);
              pdf.getPage(1)
                .then((page) => {
                  const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
                  p.render(this.width, this.height);
                  this._renderedPages.push(p);
                  // const removedPage = this.renderedPages.shift();
                  // removedPage.destroy();
                  this._isLoading = false;
                });
            } else {
              //nothing more
            }
          });
      });
    }
  } else {
    //error no pdf / lastPage
  }
}

const setScrollHandling = function (trapElement) {
  trapElement.focus();
  trapElement.addEventListener('mouseenter', (e) => {
    this._trapToken = scrolltrap.attach(trapElement)
  });

  trapElement.addEventListener('mouseleave', (e) => {
    scrolltrap.destroy(this._trapToken);
  });

  trapElement.addEventListener('scroll', (e) => {
    const scrollTop = e.target.scrollTop;
    const scrollHeight = e.target.scrollHeight;
    const scrollBottom = e.target.offsetHeight + scrollTop;

    if (scrollTop <= this._loadOffset && this._lastScrollTop > scrollTop) {
      console.log("Get Prev");
      loadPrev.bind(this)();
    }

    if (scrollBottom >= (scrollHeight - this._loadOffset) && this._lastScrollTop < scrollTop) {
      console.log("Get Next");
      loadNext.bind(this)();
    }
    this._lastScrollTop = e.target.scrollTop;
  });
}

const resetViewer = function() {
  for (const page of this._renderedPages) {
    page.destroy();
  }
  this.renderedPages = [];
  for (const pdf of this._pdfs) {
    pdf.cleanup();
  }
  this.pdfs = [];
}

const createPdfViewer = function () {
  this._parentElement.innerHTML = `
        <div id="${this._viewerContainerId}" class="pdfContainer" style="width: ${this._width}px; height: ${this._height};">
            <div id="${this._viewerId}" class="pdfViewer" style="width: ${this._width + 16}px; height: ${this._height};">
                <div id="${this._pagesContainerId}">
                </div>
            <div>
        </div>`;
}

export default class Viewer {
  constructor(id, parentElement, width, height) {
    this._id = id;
    this._parentElement = parentElement;
    this._width = width;
    this._height = height;

    this._viewerContainerId = `container_${this.id}`;
    this._viewerId = `viewer_${this.id}`;
    this._pagesContainerId = `pages_container_${this.id}`;
    this._trapToken = undefined;
    this._lastScrollTop = 0;
    this._loadOffset = 0;
    this._offsetMultiplier = 0;
    this._pdfs = [];
    this._renderedPages = [];
    this._isLoading = false;

    this.getPrev = () => undefined;
    this.getNext = () => undefined;

    createPdfViewer.bind(this)();
    setScrollHandling.bind(this)(document.getElementById(this._viewerId));
  }

  set pdf(pdf) {
    resetViewer.bind(this)();
    const loadPdf = new CancelablePromise(pdfjsLib.getDocument(pdf.url));
    loadPdf.promise
      .then((pdf) => {
        this._pdfs = [pdf];
        for (let i = 1; i < pdf.numPages && i <= 2; i++) {
          pdf.getPage(i)
            .then((page) => {
              const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
              const renderTask = p.render(this._width, this._height);
              if (p.pageNumber === 1) {
                renderTask
                  .then(() => {
                    this._loadOffset = p.pageHeight * this._offsetMultiplier;
                  });
              }
              this._renderedPages.push(p);
            });

        }
      }, (error) => {
        console.error(error);
      }
      );
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
    for (const page of this._renderedPages) {
      page.render(width, height);
    }
    if (this._renderedPages.length) {
      this._loadOffset = this._renderedPages[0].pageHeight * this._offsetMultiplier;
    }
  }

  destroy() {
    resetViewer.bind(this)();
    this._parentElement.innerHTML = "";
    //TODO
  }
}