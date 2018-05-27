connc
==================


[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coveralls][coveralls-image]][coveralls-url]
[![NPM License][license-image]][npm-url]


Connect Business Cycle Class

# Install
```
npm install connc --save
```

# Useage

```
var connc = require('connc');
var processor = connc(
    {
        requestAllData: function()
        {
            return {key: 'val'}
        }
    });

processor.connect(req)
    .then(function(data)
    {
        res.send(data.body);
    });
```


[npm-image]: http://img.shields.io/npm/v/connc.svg
[downloads-image]: http://img.shields.io/npm/dm/connc.svg
[npm-url]: https://www.npmjs.org/package/connc
[travis-image]: http://img.shields.io/travis/Bacra/node-connc/master.svg?label=linux
[travis-url]: https://travis-ci.org/Bacra/node-connc
[coveralls-image]: https://img.shields.io/coveralls/Bacra/node-connc.svg
[coveralls-url]: https://coveralls.io/github/Bacra/node-connc
[license-image]: http://img.shields.io/npm/l/connc.svg
