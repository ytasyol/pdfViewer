import scrolltrap from 'scrolltrap';
import Page from './page';
import CancelablePromise from './cancelablePromise';
import loadingGif from './loader.gif';
//TODO cleanup pdfs, promise handling, statusbar update
require('./viewer.css');

const loadPrevPages = function(pdf, index, count, tempContainer) {
  const fragment = tempContainer || document.createDocumentFragment();
  const loadFinished = () => {
    loadPrevPages.bind(this)(pdf, index - 1, count ? count + 1 : 1, fragment);
  }

  if ((isNaN(count) || count < this.loadPagesCount) && index > 0) {
    pdf.getPage(index)
      .then((page) => {
        const p = new Page(page, pdf.fingerprint, fragment, true);
        const renderTask = p.render(this._width, this._height);
        renderTask
          .then(loadFinished)
          .catch(loadFinished);
        this._renderedPages.unshift(p);
        if (this._renderedPages > this.maxPagesCount) {
          const removedPage = this.renderedPages.pop();
          removedPage.destroy();
        }
      })
      .catch((error) => {
        //could not get page, action?!
      });
  } else {
    const loadingPrev = document.getElementById(this._loadingPrevId);
    if (fragment) {
      const container = document.getElementById(this._pagesContainerId);
      const oldFirst = container.childNodes[0];
      container.insertBefore(fragment, oldFirst);
      //Position Fix
      document.getElementById(this._viewerId).scrollTop = oldFirst.offsetTop - loadingPrev.offsetHeight;
    }
    loadingPrev.style.display = 'none';
    this._isLoading = false;
  }
}

const loadPrev = function () {
  const firstPage = this._renderedPages[0];
  const pdfContaier = this._pdfs.find((p) => p.fingerprint === firstPage.fingerprint);
  if (firstPage && pdfContaier && !this._isLoading && this._hasPrev) {
    this._isLoading = true;
    document.getElementById(this._loadingPrevId).style.display = 'block';
    if (firstPage.pageNumber > 1) {
      loadPrevPages.bind(this)(pdfContaier.file, firstPage.pageNumber - 1);
    } else {
      this.getPrev((pdfInfo) => {
        if (pdfInfo) {
          const loadPdf = new CancelablePromise(pdfjsLib.getDocument(pdfInfo.url));
          loadPdf.promise
            .then((pdf) => {
              this._pdfs.push(new PdfContainer(pdfInfo.title, pdfInfo.url, pdf));
              loadPrevPages.bind(this)(pdf, pdf.numPages);
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

const loadNextPages = function(pdf, index, count, tempContainer) {
  const fragment = tempContainer || document.createDocumentFragment();
  const loadFinished = () => {
    loadNextPages.bind(this)(pdf, index + 1, count ? count + 1 : 1, fragment);
  }

  if ((isNaN(count) || count < this.loadPagesCount) && index <= pdf.numPages) {
    pdf.getPage(index)
      .then((page) => {
        count++;
        const p = new Page(page, pdf.fingerprint, fragment);
        const renderTask = p.render(this._width, this._height);
        renderTask
          .then(loadFinished)
          .catch(loadFinished);
        this._renderedPages.push(p);
        if (this._renderedPages.length > this.maxPagesCount) {
          const removedPage = this._renderedPages.shift();
          removedPage.destroy();
        }
      })
      .catch((error) => {
        //could not get page, action?!
      });
  } else {
    if (fragment) {
      document.getElementById(this._pagesContainerId).appendChild(fragment);
    }
    document.getElementById(this._loadingPrevId).style.display = 'none';
    this._isLoading = false;
  }
}

const loadNext = function () {
  const lastPage = this._renderedPages[this._renderedPages.length - 1];
  const pdfContaier = this._pdfs.find((p) => p.fingerprint === lastPage.fingerprint);
  if (lastPage && pdfContaier && !this._isLoading && this._hasNext) {
    this._isLoading = true;
    document.getElementById(this._loadingNextId).style.display = 'block';
    if (lastPage.pageNumber < pdfContaier.numPages) {
      loadNextPages.bind(this)(pdfContaier.file, lastPage.pageNumber + 1);
    } else {
      this.getNext((pdfInfo) => {
        const loadPdf = new CancelablePromise(pdfjsLib.getDocument(pdfInfo.url));
        loadPdf.promise
          .then((pdf) => {
            if (pdf) {
              this._pdfs.push(new PdfContainer(pdfInfo.title, pdfInfo.url, pdf));
              loadNextPages.bind(this)(pdf, 1);
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
    const delta = e.deltaY;
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

const renderStatusBarChanges = function (pdf, pageNumber) {
  if (this.showStatusBar) {
    const titleElement = document.querySelector(`#${this._viewerStatusBarId} .title`);
    const pagesElement = document.querySelector(`#${this._viewerStatusBarId} .pages`);
    if(titleElement) {
      titleElement.textContent = pdf.title;
    }
    if(pagesElement) {
      pagesElement.textContent = `${pageNumber} of ${pdf.file.numPages}`;
    }
  }
}

const resetViewer = function () {
  for (const page of this._renderedPages) {
    page.destroy();
  }
  this.renderedPages = [];
  for (const pdf of this._pdfs) {
    pdf.file.cleanup();
  }
  this.pdfs = [];
  document.getElementById(this._loadingNextId).style.display = 'none';
  document.getElementById(this._loadingPrevId).style.display = 'none';
}

const createPdfViewer = function () {
  this._parentElement.innerHTML = `
        <div id="${this._viewerContainerId}" class="pdfContainer" style="width: ${this._width}px; height: ${this._height};">
          <div id="${this._loadingOverlayId}" class="loadingOverlay" style="display: none;">
            <img src="${loadingGif}"/>
          </div>  
          <div id="${this._viewerId}" class="pdfViewer" style="width: ${this._width + 16}px; height: ${this._height};">
            <div id="${this._loadingPrevId}" class="loadingPrev" style="display: none;">
              <img src="${loadingGif}"/>
            </div>  
            <div id="${this._pagesContainerId}"></div>
            <div id="${this._loadingNextId}" class="loadingNext" style="display: none;">
              <img src="${loadingGif}"/>
            </div>  
          </div>
          <div id="${this._viewerStatusBarId}" class="statusBar">
            <span class="title"></span><span class="pages"></span>
          </div>
        </div>`;
}

class PdfContainer {
  constructor(title, url, file) {
    this.title = title;
    this.url = url;
    this.file = file;
  }

  get fingerprint() {
    return this.file.fingerprint;
  }

  get numPages() {
    return this.file.numPages;
  }
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
    this._loadingOverlayId = `loading_${this._id}`;
    this._viewerStatusBarId = `viewer_statusbar_${this._id}`;
    this._trapToken = undefined;
    this._lastScrollTop = 0;
    this._loadOffset = 0;
    this._pdfs = [];
    this._renderedPages = [];
    this._isLoading = false;
    this._hasNext = true;
    this._hasPrev = true;
    this._loadTask = undefined;

    this.loadingOffsetPages = 1;
    this.maxPagesCount = 15;
    this.preLoadPagesCount = 5;
    this.loadPagesCount = 5;
    this.showStatusBar = true;
    this.getPrev = () => undefined;
    this.getNext = () => undefined;

    createPdfViewer.bind(this)();
    setScrollHandling.bind(this)(document.getElementById(this._viewerId));
  }

  set pdf(pdfInfo) {
    resetViewer.bind(this)();
    if (this._loadTask) {
      this._loadTask.cancel();
    }
    document.getElementById(this._loadingOverlayId).style.display = 'block';
    this._loadTask = new CancelablePromise(pdfjsLib.getDocument(pdfInfo.url));
    this._loadTask.promise
      .then((pdf) => {
        this._pdfs = [new PdfContainer(pdfInfo.title, pdfInfo.url, pdf)];
        for (let i = 1; i <= pdf.numPages && i <= this.preLoadPagesCount; i++) {
          pdf.getPage(i)
            .then((page) => {
              const p = new Page(page, pdf.fingerprint, document.getElementById(this._pagesContainerId));
              const renderTask = p.render(this._width, this._height);
              if (p.pageNumber === 1) {
                renderTask
                  .then(() => {
                    this._loadOffset = p.pageHeight * this.loadingOffsetPages;
                    document.getElementById(this._loadingOverlayId).style.display = 'none';
                    renderStatusBarChanges.bind(this)(this._pdfs[0] ,1);
                  });
              }
              this._renderedPages.push(p);
            });

        }
      }).catch((error) => {
        if (error !== CancelablePromise.CANCELED) {
          document.getElementById(this._loadingOverlayId).style.display = 'none';
          console.error(error);
        }
      });
  }

  toggleStatusBar() {
    
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
    for (const page of this._renderedPages) {
      page.render(width, height);
    }
    if (this._renderedPages.length) {
      this._loadOffset = this._renderedPages[0].pageHeight * this.loadingOffsetPages;
    }
  }

  destroy() {
    resetViewer.bind(this)();
    this._parentElement.innerHTML = "";
  }
}