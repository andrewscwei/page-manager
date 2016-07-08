// (c) Andrew Wei

'use strict';

const _ = require('lodash');
const page = require('page');
const request = require('superagent');

const DEFAULT_PAGE_ID = 'page';

/**
 * Singleton class for managing page routing and traisitions. Routing is based
 * on PageJS - see {@link https://visionmedia.github.io/page.js/}.
 *
 * @class
 */
class PageManager {
  /**
   * The shared singleton PageManager instance.
   *
   * @type {PageManager}
   */
  static get sharedInstance() {
    if (PageManager.__private__ === undefined) PageManager.__private__ = {};
    if (PageManager.__private__.sharedInstance === undefined) PageManager.__private__.sharedInstance = new PageManager();
    return PageManager.__private__.sharedInstance;
  }

  /**
   * PageJS instance.
   *
   * @type {PageJS}
   */
  static get router() {
    return page;
  }

  /**
   * ID of the target element where non-root pages will be loaded into.
   *
   * @type {string}
   */
  static get targetElementID() { return (PageManager.__private__ && PageManager.__private__.targetElementID) || DEFAULT_PAGE_ID; }
  static set targetElementID(val) {
    if (typeof val !== 'string') throw new Error(`Target element ID must be a string`);
    if (PageManager.__private__ === undefined) PageManager.__private__ = {};
    PageManager.__private__.targetElementID = val;
  }

  /**
   * Supported locales.
   *
   * @type {Array}
   */
  static get locales() { return (PageManager.__private__ && PageManager.__private__.locales) || ['en']; }
  static set locales(val) {
    if (!(val instanceof Array)) throw new Error(`Locales must be an array`);
    if (PageManager.__private__ === undefined) PageManager.__private__ = {};
    PageManager.__private__.locales = val;
  }

  /**
   * Specifies whether PageManager will use the PageJS router. If set to `#`,
   * hashbang will be enabled.
   *
   * @type {boolean|string}
   */
  static get autoRouting() {
    let o = PageManager.__private__ && PageManager.__private__.autoRouting;
    if ((typeof o !== 'string') && (typeof o !== 'boolean')) return true;
    return o;
  }

  static set autoRouting(val) {
    if (PageManager.__private__ === undefined) PageManager.__private__ = {};
    PageManager.__private__.autoRouting = val;
  }

  /** @see PageManager#previousPage */
  static get previousPage() { return PageManager.sharedInstance.previousPage; }

  /** @see PageManager#currentPage */
  static get currentPage() { return PageManager.sharedInstance.currentPage; }

  /** @see PageManager#previousLocale */
  static get previousLocale() { return PageManager.sharedInstance.previousLocale; }

  /** @see PageManager#currentLocale */
  static get currentLocale() { return PageManager.sharedInstance.currentLocale; }

  /** @see PageManager#defineRoute */
  static route() { PageManager.sharedInstance.defineRoute.apply(PageManager.sharedInstance, arguments); }

  /** @see PageManager#defineRequest */
  static request() {
    let args = Array.prototype.slice.call(arguments, 0);
    PageManager.sharedInstance.defineRequest.apply(PageManager.sharedInstance, args);
  }

  /** @see PageManager#defineTransition */
  static transition() {
    let args = Array.prototype.slice.call(arguments, 0);
    PageManager.sharedInstance.defineTransition.apply(PageManager.sharedInstance, args);
  }

  /** @see PageManager#defineLoad */
  static on() {
    let args = Array.prototype.slice.call(arguments, 0);
    PageManager.sharedInstance.defineLoad.apply(PageManager.sharedInstance, args);
  }

  /**
   * Normalizes a path so that it always starts with exactly one '/' and ends
   * with either '/' or '*', option to strip locale prefixes.
   *
   * @param {string} path
   * @param {boolean} stripLocale
   *
   * @example
   *   PageManager.localizePath('/about')     // '/about/'
   *   PageManager.localizePath('/about/')    // '/about/'
   *   PageManager.localizePath('about/')     // '/about/'
   *   PageManager.localizePath('/fr/about/') // '/about/'
   *   PageManager.localizePath('/fr/*')      // '/*'
   *
   * @return {string}
   */
  static normalizePath(path, stripLocale) {
    if (!path) return null;

    let p = _.compact(path.split('/'));

    if (stripLocale) {
      let l = PageManager.locales.slice(1);
      if (l.indexOf(p[0]) >= 0) p.shift();
    }

    p = `/${p.join('/')}`;
    if (!_.endsWith(p, '*') && !_.endsWith(p, '/')) p += '/';

    return p;
  }

  /**
   * Gets the closest wildcard path to the specified path.
   *
   * @param {string} path
   *
   * @return {string}
   */
  static getClosestWildcardPath(path) {
    if (!path) return null;
    path = PageManager.normalizePath(path);
    let p = _.compact(path.split('/'));
    if ((p.length > 0) && (p[p.length-1] === '*')) p.pop();
    if (p.length > 0) p.pop();
    p.push('*')
    return `/${p.join('/')}`;
  }

  /**
   * Checks to see if a target path is a subset of a wildcard path ending with
   * *.
   *
   * @param {string} wildcardPath
   * @param {string} targetPath
   */
  static isSubsetOfWildcardPath(wildcardPath, targetPath) {
    if (!wildcardPath || !targetPath) return false;
    wildcardPath = PageManager.normalizePath(wildcardPath);
    targetPath = PageManager.normalizePath(targetPath);
    if (!_.endsWith(wildcardPath, '*')) return false;
    let t = wildcardPath.substr(0, wildcardPath.length-1);
    return (targetPath.indexOf(t) === 0);
  }

  /** @see PageManager#startRouting() */
  static startRouting() { PageManager.sharedInstance.startRouting(); }

  /** @see PageManager#stopRouting() */
  static stopRouting() { PageManager.sharedInstance.stopRouting(); }

  /**
   * Path history (a LIFO stack).
   *
   * @type {Array}
   */
  get history() {
    if (this.__private__ === undefined) this.__private__ = {};
    if (this.__private__.history === undefined) this.__private__.history = [];
    return this.__private__.history;
  }

  /**
   * Previous page.
   *
   * @type {string}
   */
  get previousPage() {
    let l = this.history.length;
    let p = (l > 1) ? this.history[l-2] : null;
    return PageManager.normalizePath(p);
  }

  /**
   * Current page.
   *
   * @type {string}
   */
  get currentPage() {
    let l = this.history.length;
    let p = (l > 0) ? this.history[l-1] : window.location.pathname;
    return PageManager.normalizePath(p);
  }

  /**
   * Previous locale.
   *
   * @type {string}
   */
  get previousLocale() {
    if (this.previousPage) {
      let l = PageManager.locales.slice(1);
      let p = _.compact(this.previousPage.split('/')).shift();

      if (l.indexOf(p) < 0)
        return null;
      else
        return p;
    }

    return null;
  }

  /**
   * Current locale.
   *
   * @type {string}
   */
  get currentLocale() {
    if (this.currentPage) {
      let l = PageManager.locales.slice(1);
      let p = _.compact(this.currentPage.split('/')).shift();

      if (l.indexOf(p) < 0)
        return null;
      else
        return p;
    }

    return null;
  }

  /**
   * Look-up dictionary for request handlers.
   *
   * @type {Object}
   */
  get requests() {
    if (this.__private__ === undefined) this.__private__ = {};
    if (this.__private__.requests === undefined) this.__private__.requests = {};
    return this.__private__.requests;
  }

  /**
   * Look-up dictionary for in and out transitions.
   *
   * @type {Object}
   */
  get transitions() {
    if (this.__private__ === undefined) this.__private__ = {};
    if (this.__private__.transitions === undefined) this.__private__.transitions = { in: {}, out: {} };
    return this.__private__.transitions;
  }

  /**
   * Look-up dictionary for page load handlers.
   *
   * @type {Object}
   */
  get initializers() {
    if (this.__private__ === undefined) this.__private__ = {};
    if (this.__private__.initializers === undefined) this.__private__.initializers = { beforeLoad: {}, loading: {}, afterLoad: {} };
    return this.__private__.initializers;
  }

  /**
   * Creates a new PageManager instance.
   */
  constructor() {
    if (!PageManager.__private__) throw new Error('PageManager is meant to be a singleton class and should not be instantiated via new. Fetch the single instance using PageManager.sharedInstance.');

    if (PageManager.autoRouting) {
      // Track page history.
      page('/*', (ctx, next) => {
        // Only handle page change if it's different.
        if (!this.history.length || (ctx.path !== this.history[this.history.length-1])) {
          this.history.push(ctx.path);
          next();
        }
      });

      // Initiate transition out.
      page('/*', (ctx, next) => {
        if (ctx.init) {
          next();
        }
        // No transition out if switching locales.
        else if (PageManager.previousLocale !== PageManager.currentLocale) {
          next();
        }
        else {
          let transition = this.lookUp(this.transitions.out, this.previousPage, this.currentPage);
          if (transition)
            transition(next);
          else
            next();
        }
      });

      // Load new page.
      page('/*', (ctx, next) => {
        if (ctx.init) {
          next();
        }
        else {
          request
            .get(ctx.canonicalPath)
            .end((err, res) => {
              if (!err && res.text) {
                let newDocument = new DOMParser().parseFromString(res.text, 'text/html');
                let currPage = document.getElementById(PageManager.targetElementID);
                let newPage = newDocument.getElementById(PageManager.targetElementID);
                let n = newPage.childNodes.length;

                let handler = this.lookUp(this.requests, this.currentPage, this.previousPage);

                function done() {
                  document.title = newDocument.title;
                  document.body.className = newDocument.body.className;

                  while (currPage.childNodes.length > 0)
                    currPage.removeChild(currPage.firstChild);

                  for (let i = 0; i < n; i++) {
                    let node = document.importNode(newPage.childNodes[i], true);
                    currPage.appendChild(node);
                  }

                  next();
                }

                if (handler) {
                  handler(newDocument, document, done);
                }
                else {
                  done();
                }
              }
            });
        }
      });

      // Initiate transition in.
      page('/*', (ctx, next) => {
        if (false && ctx.init) {
          next();
        }
        else {
          let transition = this.lookUp(this.transitions.in, this.currentPage, this.previousPage);

          if (transition)
            transition(next);
          else
            next();
        }
      });

      page('/*', (ctx, next) => {
        this.initPage();
      });
    }
  }

  /**
   * Defines a route using the PageJS API.
   *
   * @see {@link https://visionmedia.github.io/page.js/}
   */
  defineRoute() { page.apply(page, arguments); }

  /**
   * Defines a request handler.
   *
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            1: This will be the handler for all page
   *                               requests made.
   *                            2: This will be the to path.
   *                            3: This will be the from path.
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            2: This will be the handler for all page
   *                               requests made.
   *                            3: This will be the to path.
   * @param {function} - The handler for requests made for the specific from/to
   *                     path combo.
   */
  defineRequest() {
    let arg1 = arguments[0];
    let arg2 = arguments[1];
    let arg3 = arguments[2];
    let fromPath = '/*';
    let toPath = '/*';
    let handler = null;

    switch (arguments.length) {
      case 1:
        if (typeof arg1 !== 'function') throw new Error(`Second argument to defineRequest() must be a function`);
        handler = arg1;
        break;
      case 2:
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
          fromPath = arg1;
          toPath = arg2;
        }
        else if (typeof arg1 === 'string' && typeof arg2 === 'function') {
          toPath = arg1;
          handler = arg2;
        }
        else {
          throw new Error(`Expecting first argument to be a path and second argument to be either a path/function`);
        }
        break;
      case 3:
        if (typeof arg1 !== 'string') throw new Error(`First argument to defineRequest() must be a path`);
        if (typeof arg2 !== 'string') throw new Error(`Second argument to defineRequest() must be a path`);
        if (typeof arg3 !== 'function') throw new Error(`Third argument to defineRequest() must be a function`);
        fromPath = arg1;
        toPath = arg2;
        handler = arg3;
        break;
      default:
        throw new Error(`Invalid arguments passed to defineRequest(), expecting at least 1 and maximum 3 arguments`);
    }

    toPath = PageManager.normalizePath(toPath, true);
    fromPath = PageManager.normalizePath(fromPath, true);

    if (!this.requests[toPath]) this.requests[toPath] = {};
    this.requests[toPath][fromPath] = handler;
  }

  /**
   * Defines a transition (in/out).
   *
   * @param {string} - The direction of the transition, either 'in' or 'out'.
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            2: This will be the handler for all transitions
   *                               of the specified direction.
   *                            3: This will be the from path if the direction
   *                               is 'out' or the to path if the direction is
   *                               'in'.
   *                            4: This will be the from path.
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            3: This will be the handler for all transitions
   *                               of the specified direction.
   *                            4: This will be the to path.
   * @param {function} - The handler for transitions defined in this direction
   *                     for the specific from/to path combos.
   */
  defineTransition() {
    let arg1 = arguments[0];
    let arg2 = arguments[1];
    let arg3 = arguments[2];
    let arg4 = arguments[3];
    let fromPath = '/*';
    let toPath = '/*';
    let handler = null;

    // Sanity checks.
    if (arg1 !== 'in' && arg1 !== 'out') throw new Error(`First argument to defineTransition() must be either 'in' or 'out'`);

    switch (arguments.length) {
      case 2:
        if (typeof arg2 !== 'function') throw new Error(`Second argument to defineTransition() must be a function`);
        handler = arg2;
        break;
      case 3:
        if (typeof arg2 === 'string' && typeof arg3 === 'string') {
          fromPath = arg2;
          toPath = arg3;
        }
        else if (typeof arg2=== 'string' && typeof arg3 === 'function') {
          if (arg1 === 'in')
            toPath = arg2;
          else
            fromPath = arg2;

          handler = arg3;
        }
        else {
          throw new Error(`Expecting second argument to be a path and third argument to be either a path/function`);
        }
        break;
      case 4:
        if (typeof arg2 !== 'string') throw new Error(`Second argument to defineTransition() must be a path`);
        if (typeof arg3 !== 'string') throw new Error(`Third argument to defineTransition() must be a path`);
        if (typeof arg4 !== 'function') throw new Error(`Forth argument to defineTransition() must be a function`);
        fromPath = arg2;
        toPath = arg3;
        handler = arg4;
        break;
      default:
        throw new Error(`Invalid arguments passed to defineTransition(), expecting at least 2 and maximum 4 arguments`);
    }

    toPath = PageManager.normalizePath(toPath, true);
    fromPath = PageManager.normalizePath(fromPath, true);

    if (arg1 === 'in') {
      if (!this.transitions.in[toPath]) this.transitions.in[toPath] = {};
      this.transitions.in[toPath][fromPath] = handler;
    }
    else {
      if (!this.transitions.out[fromPath]) this.transitions.out[fromPath] = {};
      this.transitions.out[fromPath][toPath] = handler;
    }
  }

  /**
   * Defines handler that triggers before a page is fully loaded.
   *
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            1. Handler invoked after every page load.
   *                            2. The path or load state this handler is
   *                               defined for. Load states are one of
   *                               'beforeLoad', 'loading', or 'afterLoad'.
   *                            3. The load state of the page of which the
   *                               handler should be invoked: 'beforeLoad',
   *                               'loading', or 'afterLoad'.
   * @param {string|Function} - The meaning of this value depends on the number
   *                            of arguments passed into this method.
   *                            2. Handler invoked at the specified state or
   *                               path of the page load.
   *                            3. The path this handler is defined for.
   * @param {Function} - Handler invoked at the specified state and path of the
   *                     page load.
   */
  defineLoad() {
    let arg1 = arguments[0];
    let arg2 = arguments[1];
    let arg3 = arguments[2];
    let state = 'afterLoad';
    let path = '/*';
    let handler = null;

    switch (arguments.length) {
      case 1:
        if (typeof arg1 !== 'function') throw new Error(`defineLoad() expects argument to be a function when only 1 argument is passed`);
        handler = arg1;
        break;
      case 2:
        if (typeof arg1 !== 'string' || typeof arg2 !== 'function') throw new Error(`defineLoad() expects first argument to be a load state/path and second argument to be a function`);
        if (arg1 === 'beforeLoad' || arg1 === 'loading' || arg1 !== 'afterLoad')
          state = arg1;
        else
          path = arg1;
        handler = arg2;
        break;
      case 3:
        if (typeof arg1 !== 'string' || typeof arg2 !== 'string' || typeof arg3 !== 'function') throw new Error(`defineLoad() expects first argument to be a load state, second argument to be a path, and third argument to be a function`);
        if (arg1 !== 'beforeLoad' && arg1 !== 'loading' && arg1 !== 'afterLoad') throw new Error(`Bad load state specified`);
        state = arg1;
        path = arg2;
        handler = arg3;
        break;
      default:
        throw new Error(`Invalid arguments passed into defineLoad()`);
    }

    this.initializers[state][PageManager.normalizePath(path, true)] = handler;
  }

  /**
   * Starts the router.
   */
  startRouting() {
    if (PageManager.autoRouting) {
      ready(() => {
        page.start({
          hashbang: (PageManager.autoRouting === '#')
        });
      });
    }
    else {
      ready(() => {
        let transition = this.lookUp(this.transitions.in, this.currentPage, this.previousPage);
        if (transition)
          transition(this.initPage.bind(this));
        else
          this.initPage();
      });
    }
  }

  /**
   * Stops the router.
   */
  stopRouting() {
    page.stop();
  }

  /**
   * Intializes a new page.
   */
  initPage() {
    let beforeLoad = this.lookUp(this.initializers.beforeLoad, this.currentPage);

    if (beforeLoad)
      beforeLoad(this.loadPage.bind(this));
    else
      this.loadPage();
  }

  /**
   * Loads page assets.
   */
  loadPage() {
    let duringLoad = this.lookUp(this.initializers.loading, this.currentPage);
    let afterLoad = this.lookUp(this.initializers.afterLoad, this.currentPage);

    if (afterLoad) afterLoad(_.noop);
  }

  /**
   * Looks up a path-keyed dictionary and returns its value.
   *
   * @param {Object} dict
   * @param {string} path
   * @param {string} subpath
   *
   * @return {*}
   */
  lookUp(dict, path, subpath) {
    if (path) path = PageManager.normalizePath(path, true);
    if (subpath) subpath = PageManager.normalizePath(subpath, true);

    if (!dict[path]) {
      if (path === '/*') return null;
      return this.lookUp(dict, PageManager.getClosestWildcardPath(path), subpath);
    }
    else {
      if (typeof dict[path] === 'function') return dict[path];
      if (typeof dict[path] === 'object') {
        if (dict[path][subpath || '/*']) return dict[path][subpath || '/*'];
        if (subpath === '/*') return null;
        let d = this.lookUp(dict, path, PageManager.getClosestWildcardPath(subpath));
        if (d) return d;
        return this.lookUp(dict, PageManager.getClosestWildcardPath(path), subpath);
      }
      else {
        return null;
      }
    }
  }
}

/**
 * Helper function for invoking a callback when the DOM is ready.
 *
 * @param {Function} callback
 *
 * @private
 */
function ready(callback) {
  let onLoaded = (event) => {
    if (document.addEventListener) {
      document.removeEventListener('DOMContentLoaded', onLoaded, false);
      window.removeEventListener('load', onLoaded, false);
    }
    else if (document.attachEvent) {
      document.detachEvent('onreadystatechange', onLoaded);
      window.detachEvent('onload', onLoaded);
    }

    setTimeout(callback, 1);
  };

  if (document.readyState === 'complete') return setTimeout(callback, 1);

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', onLoaded, false);
    window.addEventListener('load', onLoaded, false);
  }
  else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', onLoaded);
    window.attachEvent('onload', onLoaded);
  }
}

module.exports = PageManager;
