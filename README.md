# page-manager [![Circle CI](https://circleci.com/gh/andrewscwei/page-manager/tree/master.svg?style=svg)](https://circleci.com/gh/andrewscwei/page-manager/tree/master) [![npm version](https://badge.fury.io/js/page-manager.svg)](https://badge.fury.io/js/page-manager)

`PageManager` is a singleton class that manages front-end routing (based on [Page.js](https://visionmedia.github.io/page.js/)), page transitions and page loading.

## Usage

```js
import pm from 'page-manager';

pm.locales = ['en', 'fr'];
pm.autoRouting = true;

pm.request((newDocument, oldDocument, next) => {
  // Do something to new/old document elements when new request is made.
  next();  
});

pm.transition('in', (next) => {
  // Transition-in behavior for all paths.
  next();
});

pm.transition('out', '/about', (next) => {
  // Transition-out behavior of the '/about' page into any other page.
  next();
});

pm.transition('out', '/', '/about', (next) => {
  // Transition-out behavior specifically for '/' going into '/about'.
  next();
});

pm.on('beforeLoad', (next) => {
  // Do something before image preloading for all pages.
  next();
});

pm.on('loading', '/gallery', (loaded, total) => {
  // Do something while images are preloading only in the '/gallery' page.
  console.log(`Loading: ${Math.round(loaded*100)}/${total*100}`);
});

pm.on('afterLoad', '/gallery', (next) => {
  // Do something when images are done preloading in the '/gallery' page.
  next();
});

// Begin routing after all requirements are defined. Comment out this line if
// you do not want routing enabled.
pm.startRouting();
```

## API

### targetElementID

Type: `string`<br>
Default: `page`

The ID attribute of the DOM element that wraps the page.

### `autoRouting`

Type: `boolean` or `string`<br>
Default: `true`

When this property is `true`, PageManager automatically sets up a series of universal middlewares for all routes which handles page transitions, AJAX loading of other pages and injecting the loaded markup into an element with ID `#page`. This ID can be changed via the property `PageManager.targetElementID`. The order of auto-routing routines goes like this:

1. User clicks on a link that triggers a URL change.
2. PageManager picks up the change and injects the new URL into the history stack for tracking page history.
3. Address bar and window title change to reflect new URL.
4. PageManager transitions out the current page, if a transition is defined.
5. PageManager sends a GET request to load the new page, processes the HTML text in the response body, and either:
6. Replaces the entire <body> with the <body> of the loaded page if there is a locale change, or
7. Replaces the entire <div id='page'> with the <div id='page'> of the loaded page if there is no locale change.
8. PageManager invokes a transition in for the new page, if one is defined.
9. End of the routing sequence.

This property can also be set to `#`, which would enable hashbangs for Page.js. 

To disable routing altogether, ensure that `autoRouting` is set to `false` and do not invoke `PageManager.startRouting()`.

### `route()`

Type: `Function`

Client-side routing is based on [Page.js](https://visionmedia.github.io/page.js/). This method is equivalent to Page.js's `page()`.

Example:
```js
import pm from 'page-manager';

pm.route('/*', (ctx, next) => {
  // Do something for all paths.
  next();
});

pm.route('/about', (ctx, next) => {
  // Do something only when the path is '/about'
  next();
});

pm.route('/about/*', (ctx, next) => {
  // Do something for all subpages in '/about'
  next();
});

pm.startRouting();
```

### `transition(type, fromPath/toPath/handler[, toPath/handler, handler])`

Type: `Function`<br>
Param: `type` - Either `in` or `out`, where `in` means transition-in and `out` means transition-out.
Param: `fromPath` - The path which the page is transitioning from.
Param: `toPath` - The path which the page is transitioning into.
Param: `handler` - The async function invoked during the transition. A callback is automatically passed into this handler, which should be called manually to notify that transition is complete.

`fromPath` and `toPath` are optional, which both are defaulted to `/*`. When only 3 arguments are passed into this function, the second argument is `fromPath` for an `out` transition and `toPath` for an `in` transition.

Example:
```js
import pm as 'page-manager';

pm.transition('in', (next) => {
  // Transition-in behavior for all paths.
  next();
});

pm.transition('out', '/about', (next) => {
  // Transition-out behavior of the '/about' page into any other page.
  next();
});

pm.transition('out', '/', '/about', (next) => {
  // Transition-out behavior specifically for '/' going into '/about'.
  next();
});

pm.startRouting();
```

## License

This software is released under the [MIT License](http://opensource.org/licenses/MIT).
