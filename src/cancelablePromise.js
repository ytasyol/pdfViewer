export default class CancelablePromise {
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
  CancelablePromise.CANCELED = 'CANCELED';