import scrolltrap from 'scrolltrap';
import Page from './page';
import CancelablePromise from './cancelablePromise';
import loadingGif from './loader.gif';
//TODO cleanup pdf, refactoring, promise handling
require('./viewer.css');

const loadPrev = function () {
  const firstPage = this._renderedPages[0];
  const pdf = this._pdfs.find((p) => p.footprint === firstPage.footprint);
  if (firstPage && pdf && !this._isLoading && this._hasPrev) {
    this._isLoading = true;
    document.getElementById(this._loadingPrevId).style.display = 'block';
    if (firstPage.pageNumber > 1) {
      pdf.getPage(firstPage.pageNumber - 1)
        .then((page) => {
          const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId), true);
          p.render(this._width, this._height);
          this._renderedPages.unshift(p);
          if (this._renderedPages > this.maxPagesCount) {
            const removedPage = this.renderedPages.pop();
            removedPage.destroy();
          }
          this._isLoading = false;
          document.getElementById(this._loadingPrevId).style.display = 'none';
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
                  if (this._renderedPages > this.maxPagesCount) {
                    const removedPage = this.renderedPages.pop();
                    removedPage.destroy();
                  }
                  this._isLoading = false;
                  document.getElementById(this._loadingPrevId).style.display = 'none';
                });
            });
        } else {
          this._hasPrev = false;
          this._isLoading = false;
          document.getElementById(this._loadingPrevId).style.display = 'none';
        }
      });
    }
  } else {
    //error no pdf / lastPage
  }
}

// const loadNextPages = function (pdf, startIndex) {
//   for(let i = startIndex, c = 0; i < pdf.numPages && c < this.loadPagesCount; i++, c++) {
//     pdf.getPage(startIndex)
//         .then((page) => {
//           const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
//           p.render(this._width, this._height);
//           this.renderedPages.push(p);
//           if (this._renderedPages.length > this.maxPagesCount) {
//             const removedPage = this.renderedPages.shift();
//             removedPage.destroy();
//           }
//           //this._isLoading = false;
//         });
//   }
// }

const loadNext = function () {
  const lastPage = this._renderedPages[this._renderedPages.length - 1];
  const pdf = this._pdfs.find((p) => p.footprint === lastPage.footprint);
  if (lastPage && pdf && !this._isLoading && this._hasNext) {
    this._isLoading = true;
    document.getElementById(this._loadingNextId).style.display = 'block';
    if (lastPage.pageNumber < pdf.numPages) {
      pdf.getPage(lastPage.pageNumber + 1)
        .then((page) => {
          const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
          p.render(this._width, this._height);
          this._renderedPages.push(p);
          if (this._renderedPages.length > this.maxPagesCount) {
            const removedPage = this.renderedPages.shift();
            removedPage.destroy();
          }
          this._isLoading = false;
          document.getElementById(this._loadingNextId).style.display = 'none';
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
                  if (this._renderedPages.length > this.maxPagesCount) {
                    const removedPage = this.renderedPages.shift();
                    removedPage.destroy();
                  }
                  this._isLoading = false;
                  document.getElementById(this._loadingNextId).style.display = 'none';
                });
            } else {
              this._hasNext = false;
              this._isLoading = false;
              document.getElementById(this._loadingNextId).style.display = 'none';
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

  trapElement.addEventListener('wheel', (e) => {
    const target = arguments[0];
    const delta = e.deltaY; // >0 => scroll down
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const scrollBottom = target.offsetHeight + scrollTop;

    if (scrollTop <= this._loadOffset && delta < 0) {
      loadPrev.bind(this)();
    }

    if (scrollBottom >= (scrollHeight - this._loadOffset) && delta > 0) {
      loadNext.bind(this)();
    }
  });
}

const resetViewer = function () {
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
              <div id="${this._loadingPrevId}" class="loadingPrev" style="display: none;">
                <img src="${loadingGif}"/>
              </div>  
              <div id="${this._pagesContainerId}"></div>
              <div id="${this._loadingNextId}" class="loadingNext" style="display: none;">
                <img src="${loadingGif}"/>
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

    this._viewerContainerId = `container_${this._id}`;
    this._viewerId = `viewer_${this._id}`;
    this._pagesContainerId = `pages_container_${this._id}`;
    this._loadingPrevId = `loading_prev_${this._id}`;
    this._loadingNextId = `loading_next_${this._id}`;
    this._trapToken = undefined;
    this._lastScrollTop = 0;
    this._loadOffset = 0;
    this._pdfs = [];
    this._renderedPages = [];
    this._isLoading = false;
    this._hasNext = true;
    this._hasPrev = true;
    this._loadTask = undefined;

    this.scrollOffsetPages = 0;
    this.maxPagesCount = 15;
    this.preLoadPagesCount = 5;
    this.loadPagesCount = 5;
    this.getPrev = () => undefined;
    this.getNext = () => undefined;

    createPdfViewer.bind(this)();
    setScrollHandling.bind(this)(document.getElementById(this._viewerId));
  }

  set pdf(pdf) {
    resetViewer.bind(this)();
    if (this._loadTask) {
      this._loadTask.cancel();
    }
    this._loadTask = new CancelablePromise(pdfjsLib.getDocument(pdf.url));
    this._loadTask.promise
      .then((pdf) => {
        this._pdfs = [pdf];
        for (let i = 1; i < pdf.numPages && i <= this.preLoadPagesCount; i++) {
          pdf.getPage(i)
            .then((page) => {
              const p = new Page(page, pdf.footprint, document.getElementById(this._pagesContainerId));
              const renderTask = p.render(this._width, this._height);
              if (p.pageNumber === 1) {
                renderTask
                  .then(() => {
                    this._loadOffset = p.pageHeight * this.scrollOffsetPages;
                  });
              }
              this._renderedPages.push(p);
            });

        }
      }).catch((error) => {
        if (error !== CancelablePromise.CANCELED) {
          console.error(error);
        }
      });
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
    for (const page of this._renderedPages) {
      page.render(width, height);
    }
    if (this._renderedPages.length) {
      this._loadOffset = this._renderedPages[0].pageHeight * this.scrollOffsetPages;
    }
  }

  destroy() {
    resetViewer.bind(this)();
    this._parentElement.innerHTML = "";
  }
}