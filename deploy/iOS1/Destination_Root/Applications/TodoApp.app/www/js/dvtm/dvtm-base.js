/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    DvtmObject.js
 */
// register dvt variable because of the toolkit renderers
dvt = null;

(function()
{
  // Base object which provides basic function for object creation
  var DvtmObject = function() {};

  adf.mf.api.AdfObject.createSubclass(DvtmObject, adf.mf.api.AdfObject, 'adf.mf.internal.dvt.DvtmObject');

  /**
   * function create hierarchy of packages by given typeName and places the clazz object
   * into the leaf object of this hierarchy
   * @param typeName qualified name of the class/type (e.g. package.subpackage.ClassName)
   * @param clazz class or object itself
   * @param overwrite if true then it rewrites leaf object if this object exists
   * @param root base package from whitch this hierarchy is constructed (default is window)
   *
   */
  var _createPackageAndClass = function (typeName, clazz, overwrite, root)
  {
    if(root === undefined)
    {
      root = window;
    }
    while (typeName.indexOf('.') > -1)
    {
      var subPackage = typeName.substring(0, typeName.indexOf('.'));
      if (root[subPackage] === undefined)
      {
        root[subPackage] = {};
      }
      root = root[subPackage];
      typeName = typeName.substring(typeName.indexOf('.') + 1, typeName.length);
    }
    if(root[typeName] === undefined || overwrite === true)
    {
      root[typeName] = clazz;
    } 
  }
  
  // register new DvtmObject
  _createPackageAndClass('adf.mf.internal.dvt.DvtmObject', DvtmObject, false, window); 
   
  DvtmObject.SCOPE = 
  {
    // generaly available class (default)
    'PUBLIC' : 0,
    // public object wrapped into the simple object where only getInstance function is visible
    'SINGLETON' : 1
  }
   
  /**
   * @export
   *  Provides inheritance by subclassing a class from a given base class.
   *  @param  {class} extendingClass  The class to be extended from the base class.
   *  @param  {class} baseClass  The base class
   *  @param  {string} typeName The type of the extending class
   *  @param  {string} scope of the extending class (PUBLIC (default), PRIVATE, SINGLETON, ABSTRACT)
   */
  DvtmObject.createSubclass = function (extendingClass, baseClass, typeName, scope) 
  {
    if(baseClass && typeof baseClass === 'string')
    {
      baseClass = _getClass(baseClass);
    }
    
    adf.mf.api.AdfObject.createSubclass(extendingClass, baseClass, typeName);
  
    if (extendingClass !== baseClass) 
    {
      _createScope(extendingClass, typeName, scope);
    }
  }
  
  /**
   * Creates package given by packageName parameter 
   * @param packageName qualified name of the package (e.g. package.subpackage)
   * @param rootPackage base package from whitch this hierarchy is constructed (default is window)
   */
  DvtmObject.createPackage = function (packageName, rootPackage)
  {
    _createPackageAndClass(packageName, {}, false, rootPackage);
  } 
  
  /**
   * @param className qualified name of the class to be resolved
   * @return object on path described by the className 
   */
  var _getClass = function (className)
  {
    var root = window;
    while (className.indexOf('.') > -1)
    {
      var subPackage = className.substring(0, className.indexOf('.'));
      if (root[subPackage] === undefined)
      {
        return undefined;
      }
      root = root[subPackage];
      className = className.substring(className.indexOf('.') + 1, className.length);
    }
    return root[className];
  }
  
  /**
   * creates scope for the object
   * @param extendingClass top level class object
   * @param typeName fully qualified name of the class
   * @scope DvtmObject.SCOPE
   */
  var _createScope = function (extendingClass, typeName, scope) 
  {
    if(scope !== undefined && typeof scope === 'string')
    {
      scope =  DvtmObject.SCOPE[scope.toUpperCase()];
    }
    if(scope === DvtmObject.SCOPE['SINGLETON'])
    {
      var clazz = {
          'getInstance' : function()
            {
              if(extendingClass['_instance'] === undefined)
              {
                extendingClass['_instance'] = new extendingClass();
              }
              
              return extendingClass['_instance'];
            }
        }
      _createPackageAndClass(typeName, clazz, true);
    }
    else
    {
      _createPackageAndClass(typeName, extendingClass, true);
    }
  }
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/JSONPath.js
 */
(function()
{
  /**
   * @param object root from which this path should be resolved
   * @param path string path of the object
   * @param delimiter optional char which delimits packages (default is '/')
   */
  var JSONPath = function (object, path, delimiter)
  {
    if (typeof object === 'string')
    {
      path = object;
      object = window;
    }

    if (this.constructor === JSONPath)
    {
      this._path = path;
      this._root = object;
      if (delimiter == null)
      {
        if (this._path.indexOf('/') > -1)
        {
          delimiter = '/';
        }
      }
      this._delimiter = delimiter || '.';
    }
    else
    {
      var path = new JSONPath(object, path, delimiter);
      return path.getValue();
    }
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(JSONPath, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.JSONPath');
   
   /**
   * function resolves parameter of the leaf object and the leaf object itself
   */
  var _resolveLeafObjectAndProperty = function(root, path, delimiter, createIfMissing)
  {
    var result = {};
    for (var index = path.indexOf(delimiter); root && index > -1; path = path.substring(index + 1, path.length), index = path.indexOf(delimiter))
    {
      var subProperty = path.substring(0, index);     
      if(createIfMissing && root[subProperty] === undefined)
      {
        root[subProperty] = {};
      }
      root = root[subProperty];
    }
    
    if (root)
    {
      result['object'] = root;
      result['parameter'] = path;
    }
    
    return result;
  }
  
  /**
   * resolve path to the leaf object and parameter of this object
   * 
   * @param createIfMissing creates the hierarchy of the namespaces when his doesn't exist
   */
  JSONPath.prototype._resolvePath = function (createIfMissing)
  {
    if(this._leaf === undefined)
    {
      var result = _resolveLeafObjectAndProperty(this._root, this._path, this._delimiter, createIfMissing);
        
      this._leaf = result['object'];
      this._param = result['parameter']; 
    }
  }
  
   /**
   * Returns value of the leaf element of the path.
   * 
   * @return value of the leaf element or undefined if path structure is not yet created
   */
  JSONPath.prototype.getValue = function ()
  {
    this._resolvePath(false);
    return this._leaf === undefined ? undefined : this._leaf[this._param];
  }

  /**
   * Sets value of the leaf element of the path.
   * 
   * @param value
   * @return true when value of the leaf element of the path has been changed
   */
  JSONPath.prototype.setValue = function (value)
  {
    this._resolvePath(true);
    
    if (this._leaf[this._param] !== value)
    {
      this._leaf[this._param] = value;
      return true;
    }
    return false;
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/DOMUtils.js
 */
(function()
{
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.util');
  
  var DOMUtils = {};
  adf.mf.internal.dvt.DOMUtils = DOMUtils;
  
  DOMUtils.createDIV = function ()
  {
    return document.createElement("div");
  };
  
  /**
   * @param node {DOMElement}
   * @return {int} pixel width of the element's content without margin, border and padding
   */
  DOMUtils.getWidth = function (node)
  {
    var baseWidth = node.offsetWidth;
    var compStyle = window.getComputedStyle(node);
    if (compStyle)
    {
      baseWidth -= (compStyle.borderLeftWidth ? parseInt(compStyle.borderLeftWidth) : 0);
      baseWidth -= (compStyle.borderRightWidth ? parseInt(compStyle.borderRightWidth) : 0);
      baseWidth -= (compStyle.paddingLeft ? parseInt(compStyle.paddingLeft) : 0);
      baseWidth -= (compStyle.paddingRight ? parseInt(compStyle.paddingRight) : 0);
    }
    return baseWidth;
  };
  
  /**
   * @param node {DOMElement}
   * @param width {string} string representation of the width value (e.g, 10px, 10%, etc.).
   */
  DOMUtils.setWidth = function (node, width)
  {
    node.style.width = width;
  };
  
  /**
   * @param node {DOMElement}
   * @return {int} pixel height of the element's content without margin, border and padding
   */
  DOMUtils.getHeight = function (node)
  {
    var baseHeight = node.offsetHeight;
    var compStyle = window.getComputedStyle(node);
    if (compStyle)
    {
      baseHeight -= (compStyle.borderTopWidth ? parseInt(compStyle.borderTopWidth) : 0);
      baseHeight -= (compStyle.borderBottomWidth ? parseInt(compStyle.borderBottomWidth) : 0);
      baseHeight -= (compStyle.paddingTop ? parseInt(compStyle.paddingTop) : 0);
      baseHeight -= (compStyle.paddingBottom ? parseInt(compStyle.paddingBottom) : 0);
    }
    return baseHeight;
  };
  
  /**
   * @param node {DOMElement}
   * @param height {string} string representation of the height value (e.g, 10px, 10%, etc.).
   */
  DOMUtils.setHeight = function (node, height)
  {
    node.style.height = height;
  };
  
  /**
   * @param node {DOMElement}
   * @return {int} pixel height of the element's content that includes margin, border and padding
   */
  DOMUtils.getOuterHeight = function (node)
  {
    var baseHeight = node.offsetHeight;
    var compStyle = window.getComputedStyle(node);
    if (compStyle)
    {
      baseHeight += (compStyle.marginTop ? parseInt(compStyle.marginTop) : 0);
      baseHeight += (compStyle.marginBottom ? parseInt(compStyle.marginBottom) : 0);
    }
    return baseHeight;
  };
  
  /**
   * @param node {DOMElement}
   * @return {int} pixel width of the element's content  that includes  margin, border and padding
   */
  DOMUtils.getOuterWidth = function (node)
  {
    var baseWidth = node.offsetWidth;
    var compStyle = window.getComputedStyle(node);
    if (compStyle)
    {
      baseWidth += (compStyle.marginLeft ? parseInt(compStyle.marginLeft) : 0);
      baseWidth += (compStyle.marginRight ? parseInt(compStyle.marginRight) : 0);
    }
    return baseWidth;
  };
  
   /**
   * @return value of the width or height attribute
   */
  DOMUtils.parseStyleSize = function (strSize, percent)
  {
    if(strSize)
    {
      var index = strSize.indexOf(percent ? '%' : 'px');
      if(index > -1)
      {
        strSize = strSize.substring(0, index);
        var value = parseInt(strSize);
        if(value > 0)
        {
          return value;
        }
      }
    }
    return percent ? 100 : 0;
  };
  
  /**
   * writes ID attribute to the DOM element
   * 
   * @param element DOM Element
   * @param id 
   * @private
   */
  DOMUtils.writeIDAttribute = function (node, id)
  {
    node.setAttribute('id', id);
  };

  /**
   * writes style attribute to the DOM element
   * 
   * @param element DOM Element
   * @param style 
   * @private
   */
  DOMUtils.writeStyleAttribute = function (node, style)
  {
    node.setAttribute('style', style);
  };
  
  /**
   * writes class attribute to the DOM element
   * 
   * @param element DOM Element
   * @param styleClass 
   * @private
   */
  DOMUtils.writeClassAttribute = function (node, styleClass)
  {
    node.setAttribute('class', styleClass);
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/ResizeHandler.js
 */
(function(){
  
  var ResizeHandler = function ()
  {
    this._callbacks = [];
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ResizeHandler, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResizeHandler', 'singleton');
  
  /**
   * register callback that will be notified on window change event
   * 
   * @param id unique identificator of this callback
   * @param callback callback immediately executed on window resize event - function has parameter event and should 
   *   return context which will be passed into postCallback (e.g. function (event)&#123;return &#123;'contextinfo' : 'success'};})
   * @param postResizeCallback callback which is called when all callbacks are executed - function has one parameter and
   *   no return value. This parameter represents return value of function callback (e.g. function(context)&#123;}).
   *  
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype.addResizeCallback = function (id, callback, postResizeCallback, resizeData)
  {
    // register global window resize event listener only once
    if(!this['__resizeHandlerRegistered'])
    {
      this._registerResizeHandler();
      this['__resizeHandlerRegistered'] = true;
    }

    resizeData = resizeData ? resizeData : {};
    // remove all other listeners under this id
    this.removeResizeCallback(id);
    
    // add objects that represents resize handler
    this._callbacks.push({
      'id' : id,
      'callback' : function(event)
        {
          if(callback)
          {
            var result = callback (event);
            if(result)
            {
              return result;
            }
          }
          // if there is no context then create new empty one
          return {};
        },
      'postCallback' : function (event, context)
        {
          if(postResizeCallback)
          {
            postResizeCallback(event, context);
          }
        },
      'extraData' : resizeData
    });
  }

  /**
   * removes callback by specified id
   * @param id id of resize callback
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype.removeResizeCallback = function (id)
  {
    var tempArray = [];
    var callbacks = this._getResizeCallbacks();
    for(var i = 0; i < callbacks.length; i++)
    {
      if(callbacks[i]['id'] != id)
      {
        tempArray.push(callbacks[i]);
      }
    }
    this._callbacks = tempArray;
  }

  /**
   * @return array of resize handlers
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype._getResizeCallbacks = function () 
  {
    return this._callbacks;
  }

  /**
   * registeres new window resize listener which notifies all our resize handlers
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype._registerResizeHandler = function ()
  {
    var resizeHandler = function (event)
    {
      var callbacks = this._getResizeCallbacks();
      var postCallbacks = [];
      var eventDataToRestore = event.data;
      // notify all handlers about window resize event and save their return context
      for(var i = 0; i < callbacks.length; i++)
      { 
        try
        {
          event.data = callbacks[i]['extraData'];
          var returnContext = callbacks[i]['callback'](event);
          postCallbacks.push(callbacks[i]);
          // add information about event
          postCallbacks.push(returnContext);
        }
        catch (exception)
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "callback", "Exception (line: " + ex.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), '_registerResizeHandler.callback', 'Exception: ' + exception.message + " (line: " + exception.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), '_registerResizeHandler.callback', 'Stack: ' + exception.stack);
        }
      }
      // notify all postCallbacks with context from previous callbacks
      for(var j = 0; j < postCallbacks.length; j = j + 2)
      {
        try
        {
          event.data = postCallbacks[j]['extraData'];
          postCallbacks[j]['postCallback'](event, postCallbacks[j + 1]);
        }
        catch (exception)
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "postCallback", "Exception (line: " + ex.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE,
              this.getTypeName(), "_registerResizeHandler.postCallback", "Exception: " + exception.message + " (line: " + exception.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 
              this.getTypeName(), '_registerResizeHandler.postCallback', 'Stack: ' + exception.stack);
        }
      }
      event.data = eventDataToRestore;
    };
    
    window.addEventListener('resize', function (event)
    {
      // bug 18391802: on resize handler must be postponed after the height/width have been set on 'body' 
      setTimeout(function(e) 
      {
        resizeHandler.call(adf.mf.internal.dvt.util.ResizeHandler.getInstance(), e);
      }, 250, event);        // here's the delay timout
    });
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/ResourceBundleLoader.js
 */
(function()
{    
  var ResourceBundleLoader = function ()
  {
    this._loaded = [];
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ResourceBundleLoader, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResourceBundleLoader', 'singleton');

  /**
   * Loads given resource bundles.
   * @param bundles array of resource bundles to be loaded
   */
  ResourceBundleLoader.prototype.loadBundles = function (bundles, callback)
  {
    var bundle = null;

    if (bundles && bundles.length > 0)
    {
      var loadedCount = 0;
      var loadCallback = function (fromCache) 
      {
        loadedCount++;

        if (loadedCount === bundles.length)
        {
          if (!fromCache)
          {
            for (var i = 0; i < bundles.length; i++) 
            {
              bundle = bundles[i];
              var bundleCallback = bundle.getLoadCallback();
              if (bundleCallback)
              {
                bundleCallback();
              }
            }
          }

          if (callback)
          {
            callback();
          }
        }
      };

      for (var i = 0; i < bundles.length; i++) 
      {
        bundle = bundles[i];
        this.loadDvtResources(bundle.getUrl(), bundle.getCheckCallback(), loadCallback);  
      }
    }
  };

   /**
   * Load DVT bundles based on user locale
   * @param url base url of Resource Bundle
   * @param loadCheck optional check if Bundle was properly loaded
   */
  ResourceBundleLoader.prototype.loadDvtResources = function (url, checkCallback, loadCallback)
  {
    var loadedBundles = this._loaded;
     
    if (loadedBundles[url] !== undefined)
    {
      if (loadCallback) 
      {
        loadCallback(true);
      }
      // resource is already loaded or function tried to load this resource but failed
      return;
    }

    var _locale = adf.mf.locale.getUserLocale();
    // default region for en locale which is default language here
    if (_locale === 'en-us')
    {
      _locale = 'en';
    }
    var localeList = adf.mf.locale.generateLocaleList(_locale, true);
      
    var callback = function (locale)
    {
      // store some information about state of loaded js
      loadedBundles[url] = (locale === null);
      if (loadCallback) 
      {
        loadCallback(false);
      }
    };
    // function creates real path to js bundle
    var resourceBundleUrlConstructor = function (locale)
    {
      // default resource bundles
      if (locale === 'en')
      {
        return url + ".js";
      }
      // strip callendar information
      var calIndex = locale.toLowerCase().indexOf('@calendar=');
      if (calIndex > -1)
      {
        locale = locale.substring(0, calIndex);
      }
      return url + "_" + adf.mf.locale.getJavaLanguage(locale) + ".js";
    };

    var resourceBundleLoaded = function ()
    {
      // we have to leave additional check on caller funcion since Resource bundles are different in nature
      // and we don't know what kind of changes these bundles are doing.
      if (checkCallback)
      {
        return checkCallback();
      }
      // when there is no aditional check then js load success itself is resolved as complete success.
      return true;
    };

    this._loadJavaScriptByLocale(localeList, resourceBundleUrlConstructor, resourceBundleLoaded, callback);
  };

  /**
   * Function looks for first Resource Bundle that is loadable and satisfies predicate function.
   * @param localeList list of possible locales
   * @param contructor function that contructs complete url by locale and bundle base url
   * @param predicate tells if Resource Bundle is loaded successfully
   * @param callback function which will be notified after this method is complete
   *
   */
  ResourceBundleLoader.prototype._loadJavaScriptByLocale = function (localeList, constructor, predicate, callback)
  {
    // clone the array before calling the load method since it will actually
    // modify the array as it searches    
    var clonedList = localeList.slice(0);
    this._loadJavaScriptByLocaleImpl(clonedList, constructor, predicate, callback);
  };

  /**
   * Function looks recursively for the first Resource Bundle that is loadable and satisfies predicate function.
   * @param localeList list of possible locales
   * @param contructor function that contructs complete url by locale and bundle base url
   * @param predicate tells if Resource Bundle is loaded successfully
   * @param callback function which will be notified after this method is complete
   *
   * function will notify callback with null argument if no B is loaded in other case it will notify
   * callback function with locale of loaded bundle as a parameter.
   */
  ResourceBundleLoader.prototype._loadJavaScriptByLocaleImpl = function (localeList, constructor, predicate, callback)
  {
    if (localeList.length === 0)
    {
      callback(null);
      return;
    }

    var locale = localeList.pop();
    var url = constructor(locale);

    var that = this;
    // temporary synchronous solution
    adf.mf.api.resourceFile.loadJsFile(url, true, function()
    {
      if (predicate(locale))
      {
        callback(locale);
      }
      else 
      {
        that._loadJavaScriptByLocaleImpl(localeList, constructor, predicate, callback);
      }
    },
    function()
    {
      that._loadJavaScriptByLocaleImpl(localeList, constructor, predicate, callback);
    },
    function(t)
    {
      return t;
    });
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/Attributes.js
 */
(function(){
  
  /**
   *  Class representing a set of attributes.        
   */ 
  var Attributes = function(attributes)
  {
    this['attributes'] = attributes;
    this['_size'] = Object.keys(attributes).length;
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Attributes, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Attributes');
  
  /**
   *  Processes attributes set on given amx node.
   *  @param amxNode amx node     
   */  
  Attributes.processAttributes = function(amxNode, types) {
    var attrMap = {};
    // process private _tagInstances objects
    var tagInstances = amxNode["_tagInstances"];
    var tagInstance;
    
    var keys = Object.keys(tagInstances);
    for (var ii = 0, length = keys.length; ii < length; ii++)
    {
      var k = keys[ii];
      if(tagInstances.hasOwnProperty(k)) {
        for(var i=0; i < types.length; i++) {
          tagInstance = tagInstances[k];
          if(tagInstance.getTag().getName() == 'attribute') {
            var attrName = tagInstance.getTag().getAttribute("name");
            var attrValue;
            if(attrName) {
              var match = new RegExp('^'+types[i]+'\\d*$').exec(attrName);
              if(match && match.length == 1) {
                attrValue = tagInstance.getTag().getAttribute("value"); 
                if(attrValue.indexOf("#{") == -1) {
                  // static value
                  attrMap[attrName] = attrValue;
                  break; 
                } else {
                  // resolved el
                  attrValue = tagInstance["_attrs"]["value"];
                  if(attrValue) {
                    attrMap[attrName] = attrValue;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return new Attributes(attrMap);
  };
  
  /**
   *  Returns iterator that can be used to iterate over given attribute set
   *  Each attribute has following structure:
   *  {
   *    'name': 'Attribute name',
   *    'value': 'Attribute value'      
   *  }
   *  @return iterator that can be used to iterate over given attribute set     
   */  
  Attributes.prototype.iterator = function () {
    var map = this['attributes'];
    var attributes = Object.keys(map).map(function (name) 
      {
        return {'name' : name, 'value' : map[name]};
      });
    
    return adf.mf.api.amx.createIterator(attributes);
  };
  
  /**
   *  Applies all attributes in this set of attributes on given item.
   *  @param item item     
   */  
  Attributes.prototype.applyAttributes = function (item) {
    var map = this['attributes'];
    var keys = Object.keys(map);
    for (var i = 0, length = keys.length; i < length; i++)
    {
      var name = keys[i];
      item[name] = map[name];
    }
  };
  
  /**
   *  Returns value of attribute which name equals given type or null if no such attribute exists.
   *  @param type type to be resolved (e.g. color, pattern)
   *  return value of attribute which name equals given type or null if no such attribute exists   
   */ 
  Attributes.prototype.resolveValue = function(type) {
    return this['attributes'][type];
  };
  
  /**
   *  Returns size of this attribute set.
   *  @return size of this attribute set     
   */  
  Attributes.prototype.size = function () {
    return this['_size'];
  };
  
  /**
   *  Merges attrs attribute set into this attribute set
   *  @param attrs Attributes class instance
   */
  Attributes.prototype.merge = function (attrs)
  {
    if(!attrs || !attrs['attributes']) return;
    
    var keys = Object.keys(attrs['attributes']);
    for (var i = 0, length = keys.length; i < length; i++)
    {
      var name = keys[i];
      this['attributes'][name] = attrs['attributes'][name];
    }
  };
  
  /**
   *  Returns true if attributes1 equals attributes2, otherwise returns false.
   *  @param attributes1 Attributes class instance
   *  @param attributes2 Attributes class instance      
   *  @return true if attributes1 equals attributes2, otherwise returns false    
   */ 
  Attributes.equals = function (attrs1, attrs2)
  {
    if(attrs1 === attrs2) return true;
    if(!attrs1 || !attrs2 || !attrs1['attributes'] || !attrs2['attributes']) return false;
    
    var attrkeys = Object.keys(attrs1['attributes']);
    var name, i, length;
    
    for (i = 0, length = attrkeys.length; i < length; i++)
    {
      name = attrkeys[i];
      if(attrs1['attributes'][name] != attrs2['attributes'][name]) return false;
    }
    
    attrkeys = Object.keys(attrs2['attributes']);
    for (i = 0, length = attrkeys.length; i < length; i++)
    {
      name = attrkeys[i];
      if(attrs2['attributes'][name] != attrs1['attributes'][name]) return false;
    }
    
    return true;
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/AttributeGroup.js
 */
(function(){
  
  /**
   *  Class representing attribute group.  
   */  
  var AttributeGroup = function()
  {
    this['params'] = {};
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroup, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup');
  
  /**
   *  Initializes given attribute group based on given attribute groups node.  
   */  
  AttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
    var Attributes = adf.mf.internal.dvt.common.attributeGroup.Attributes;
    var Categories = adf.mf.internal.dvt.common.attributeGroup.Categories;
    
    this['id'] = attrGroupsNode.getAttribute('id');
    this['discriminant'] = attrGroupsNode.getAttribute('discriminant');
    this['categories'] = new Categories(this['discriminant']);
    this.SetType(attrGroupsNode);
    this['rules'] = new Rules();
    
    this['attributes'] = Attributes.processAttributes(attrGroupsNode, this['types']);
    
    this['legendItems'] = null;
    this['attributeValuesResolver'] = null;
    this['sharedAttributesUpdateAllowed'] = false;
  };
  
  /**
   *  Sets types this attribute group supports.
   *  @param attrGroupsNode attribute groups node     
   */  
  AttributeGroup.prototype.SetType = function (attrGroupsNode) {
    this['type'] = attrGroupsNode.getAttribute('type');
    this['types'] = [];
    if (this['type'])
    {
      this['types'] = this._parseTypes(this['type']);
    }
  };
  
  /**
   *  Returns array of types processed by the attribute group.
   *  @return array of types processed by the attribute group
   */
  AttributeGroup.prototype.getTypes = function () {
    return this['types'];
  }
  
  /**
   *  Parses type attribute and return array of particular types.
   *  @param type string containing all supported types
   *  @return array of types        
   */  
  AttributeGroup.prototype._parseTypes = function (type) {
    var types = [];
    var existingTypes = type.split(/\s+/);
    for(var i=0; i<existingTypes.length; i++) {
      if(existingTypes[i]) {
        types.push(existingTypes[i]);
      }
    }
    return types;
  };
  
  /**
   *  Returns category for given index.
   *  @param index index
   *  @return cateogory        
   */  
  AttributeGroup.prototype.getCategoryValue = function(index) {
    return this['categories'].getValueByIndex(index);
  };
  
  /**
   *  Processes item represented by given attribute groups node instance and returns processing result in the form:
   *  {
   *    'value' : processed value,
   *    'appliedExceptionRules' : array of applied exception rules indices      
   *  }
   *  @param attrGroupsNode attribute groups node
   *  @return processing information          
   */  
  AttributeGroup.prototype.processItem = function (attrGroupsNode) {
    var value = this.ProcessItemValue(attrGroupsNode);
    var exceptionRulesInfo = this.ProcessItemRules(attrGroupsNode);
    var groupLabel = attrGroupsNode.getAttribute('groupLabel');
    this['label'] = groupLabel;
    
    var info = {};
    info['value'] = value;
    info['appliedExceptionRules'] = exceptionRulesInfo;
    
    return info;
  };
  
  /**
   *  Processes given node and returns item value. Default implementation returns index of item category.
   *  @param attrGroupsNode attribute groups node
   *  @return item value          
   */  
  AttributeGroup.prototype.ProcessItemValue = function(attrGroupsNode) {
    var value = attrGroupsNode.getAttribute('value');
    var label = attrGroupsNode.getAttribute('label');
    value = this['categories'].addCategory(value, label);
    return value;
  };
  
  /**
   *  Processes given node and returns array of rules indices that are applied on given item.
   *  @param attrGroupsNode attribute groups node
   *  @return array of rules indices that are applied on given item          
   */
  AttributeGroup.prototype.ProcessItemRules = function(attrGroupsNode) {
    var rules = this['rules'];
    var appliedExceptionRuleIndices = rules.processItemRules(attrGroupsNode, this['types']);
    return appliedExceptionRuleIndices;  
  };
  
  /**
   *  Configures given attribute group so that it can be applied on data items.
   *  It is guaranteed that this method is called before data items are processed.
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute group configuration           
   */  
  AttributeGroup.prototype.configure = function (amxNode, attributeGroupConfig) {
    var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
    var AttributeValuesResolver = adf.mf.internal.dvt.common.attributeGroup.AttributeValuesResolver;
    var LegendItems = adf.mf.internal.dvt.common.attributeGroup.LegendItems;
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
    
    this['config'] = attributeGroupConfig;
    this['attributeValuesResolver'] = new AttributeValuesResolver(amxNode, this);
    
    var types = this['types'];
    var categories = this['categories'];
    var exceptionRules = this['rules'];
    var resolver = this['attributeValuesResolver'];
    
    this['legendItems'] = new LegendItems(types, categories, exceptionRules, resolver);
  };
  
  /**
   *  Sets if shared attributes can be updated. 
   *  @param allowed true if update is allowed, false otherwise           
   */
  AttributeGroup.prototype.setSharedAttributesUpdateAllowed = function(allowed) {
    this['sharedAttributesUpdateAllowed'] = allowed;
  }
  
  /**
   *  Returns true if this group initializes shared properties and false otherwise.
   *  @return true if this group initializes shared properties and false otherwise            
   */
  AttributeGroup.prototype.isSharedAttributesUpdateAllowed = function() {
    return this['sharedAttributesUpdateAllowed'] === true;
  }
  
  /**
   *  Applies the group on given data item. All information needed to process the item
   *  is stored in given info parameter:
   *  {
   *    'config' : DataItemConfig class instance
   *    'nodeInfo' : info returned by processItem function      
   *  }
   *  @param amxNode amx node
   *  @param dataItem data item
   *  @param info information needed for data item processing returned by processItem function            
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   */  
  AttributeGroup.prototype.applyGroup = function(amxNode, dataItem, info, attributeGroupConfig) {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;

    var types = this['types'];
    var indices = info['nodeInfo']['appliedExceptionRules'];
    var appliedRules = this['rules'].getByIndices(indices);
    var itemValue = info['nodeInfo']['value'];

    var type = null, mappedType, value = null;
    var updateValueCallback = null;

    // for each type (e.g. pattern, color) defined by this attribute group
    for(var i=0; i < types.length; i++) {
      type = types[i];
      mappedType = type;

      // resolve mapped type -> name of data item attribute that the resolved value will be assigned to
      if(attributeGroupConfig && attributeGroupConfig.getTypeToItemAttributeMapping(type)) { 
        mappedType = attributeGroupConfig.getTypeToItemAttributeMapping(type);
      }

      // if value is set then it won't be resolved
      // this can happen only in two cases: - the value has been set by an attribute, - the value has been set by another attribute group
      value = AttributeGroup._getAttributeValue(dataItem, mappedType);
      if(!value) {
        value = this.ResolveValue(type, appliedRules, itemValue);

        // if value is resolved then set it on given data item
        if(value) {
        
          // if update value callback is defined for given type then apply it
          if(attributeGroupConfig) {
            updateValueCallback = attributeGroupConfig.getUpdateValueCallback(type);
            if(updateValueCallback) {
              value = updateValueCallback(value, dataItem);
            }
          }
          AttributeGroup._setAttributeValue(dataItem, mappedType, value);
        }
      }
    }
    
    // update categories
    this.UpdateCategories(dataItem, info);
  };
  
  /**
   *  For each type defined by this attribute group applies default values on given data item for given type. 
   *  Default value for given type is applied only in case that given data item has no value defined for given type.
   *  
   *  @param amxNode amx node
   *  @param dataItem data item
   *  @param dataItemConfig data item configuration            
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   */  
  AttributeGroup.applyDefaultValues = function(amxNode, dataItem, dataItemConfig, attributeGroupConfig) {
    if(dataItemConfig) {
      var types = dataItemConfig.getDefaultValueTypes();
      var type = null, mappedType = null, value = null;

      // for each type (e.g. pattern, color) to that default value should be assigned
      for(var i=0; i < types.length; i++) {
        type = types[i];
        
        mappedType = type;
      
        // resolve mapped type -> name of data item attribute that the resolved value will be assigned to
        if(attributeGroupConfig && attributeGroupConfig.getTypeToItemAttributeMapping(type)) { 
          mappedType = attributeGroupConfig.getTypeToItemAttributeMapping(type);
        }
      
        value = AttributeGroup._getAttributeValue(dataItem, mappedType);
      
        // if default value callback is defined then call it
        if(!value) {
          if(dataItemConfig.getTypeDefaultValue(type)) {
            value = dataItemConfig.getTypeDefaultValue(type);
          }
        
          if(value) {
            AttributeGroup._setAttributeValue(dataItem, mappedType, value);
          }
        }
      }
    }
  };
    
  AttributeGroup._getAttributeValue = function(dataItem, mappedType) {
    var mappedTypeArray = mappedType.split ('.');
    for (var i = 0; i < mappedTypeArray.length; i++) {
      if (!dataItem) return dataItem;
      dataItem = dataItem [mappedTypeArray [i]];
    }
    return dataItem;
  };

  AttributeGroup._setAttributeValue = function(dataItem, mappedType, value) {
    var mappedTypeArray = mappedType.split ('.');
    for (var i = 0; i < mappedTypeArray.length - 1; i++) {
      var newDataItem = dataItem [mappedTypeArray [i]];
      if (!newDataItem) {
        newDataItem = {};
        dataItem [mappedTypeArray [i]] = newDataItem;
      }
      dataItem = newDataItem;
    }
    dataItem [mappedTypeArray [mappedTypeArray.length - 1]] = value;
  };  
  
  /**
   *  Resolves and returns value for given type based on given applied rules and item value.
   *  @param type type
   *  @param appliedRules applied rules
   *  @param itemValue item value
   *  @return resolved value for given type based on given applied rules and item value.                
   */  
  AttributeGroup.prototype.ResolveValue = function(type, exceptionRules, itemValue) {
    return this['attributeValuesResolver'].resolveValue(type, exceptionRules, itemValue);
  };
  
  /**
   *  Updates categories on given data item.
   *  @param dataItem data item
   *  @param info processing information           
   */  
  AttributeGroup.prototype.UpdateCategories = function(dataItem, info) {
    var attrGroupConfig = this['config'];
    var itemValue = info['nodeInfo']['value'];
    var indices = info['nodeInfo']['appliedExceptionRules'];
    var exceptionRules = this['rules'].getByIndices(indices);
    
    // if callback function is defined then call it
    var updateCategoriesCallback = attrGroupConfig ? attrGroupConfig.getUpdateCategoriesCallback() : null;
    if(updateCategoriesCallback) 
    {
      updateCategoriesCallback(this, dataItem, itemValue, exceptionRules);
    } 
    else 
    {
      // add category by its index
      if (!dataItem['categories']) dataItem['categories'] = [];
      var categories = dataItem['categories'];
      categories.push(this['categories'].getValueByIndex(itemValue));
      
      // for each exception rule add exception rule value to the categories array
      var rules = exceptionRules.getRules();
      for(var i=0; i < rules.length; i++) {
        categories.push(rules[i]['value']);
      }
    }
    
  };
  
  /**
   *  Returns array of legend items.
   *  @return array of legend items           
   */  
  AttributeGroup.prototype.getLegendItems = function() {
    return this['legendItems'].getItems();
  };
  
  /**
   *  Returns attribute group id.
   *  @return attribute group id     
   */  
  AttributeGroup.prototype.getId = function() {
    return this['id'];
  };
  
  /**
   *  Returns true if this attribute group is continuous otherwise returns false
   *  @return true if this attribute group is continuous otherwise returns false     
   */  
  AttributeGroup.prototype.isContinuous = function() {
    return false;
  };
  
  /**
   *  Returns the attribute group description in the form:
   *  {
   *    'id' : id,
   *    'type' : continuous/discrete,
   *    'groups' : array of legend items         
   *  }     
   */  
  AttributeGroup.prototype.getDescription = function() {
    var obj = {};
    obj['id'] = this['id'];
    obj['type'] = this['legendItems'].getLegendType();
    if (this['label'])
      obj['label'] = this['label'];
    obj['groups'] = this['legendItems'].getItems();
    return obj;
  };
  
  /**
   * Sets custom parameter value.
   * @param param custom parameter
   * @param value custom value
   */
  AttributeGroup.prototype.setCustomParam = function(param, value) {
    this['params'][param] = value;  
  };
  
  /**
   * Returns custom parameter value.
   * @param param custom parameter
   * @return custom parameter value
   */
  AttributeGroup.prototype.getCustomParam = function(param) {
    return this['params'][param];  
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/AttributeGroupManager.js
 */
(function(){
  
  /**
   *  A facade used to work with attribute groups. The intented usage is as follows:
   *  1. AttributeGroupManager.init
   *       Called to initialize attribute group processing.
   *          
   *  Then for each data item following functions should be called (order matters):
   *  2. AttributeGroupManager.processAttributeGroup
   *       Processes attribute group node and stores processing information into context. Processing information contains rules that are applied for
   *       this instance of attribute group node, value of this attribute group node instance etc.      
   *  3. AttributeGroupManager.registerDataItem
   *       a) Takes processing information from the context (i.e. detaches context - see AttributeGroupManager.detachProcessedAttributeGroups function)
   *       b) Connects given processing information and given data item
   *       c) Registers given data item so that all attribute groups processed using AttributeGroupManager.processAttributeGroup can be applied on it
   *  
   *  After all data items are registered following function is supposed to be called to apply attribute groups on registered data items            
   *  4. AttributeGroupManager.applyAttributeGroups
   *       Apply attribute groups on registered data items.   
   *
   *  Example:
   *     
   *   Initialize:
   *      AttributeGroupManager.init(context);
   *      ...
   *
   *   Create attribute groups and data items:
   *      var marker = this._processMarker(amxNode, markerNode);
   *      if(marker != null) {      
   *         var attributeGroupsNodes = markerNode.getChildren();
   *         var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
   *         while (iter.hasNext())
   *         {
   *           var attrGroupsNode = iter.next();
   *           ...
   *           AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
   *         }
   *         var dataItem = this._applyMarkerToModel(amxNode, marker);
   *         // all attribute groups processed in previous step are connected to given data item and this data item is
   *         // registered so that given attribute groups can be applied on it         
   *         AttributeGroupManager.registerDataItem(context, dataItem, null);   
   *         ...
   *      }
   *      ...
   *      
   *   Apply attribute groups on data items:
   *      AttributeGroupManager.applyAttributeGroups(amxNode, null, context);                            
   */  
  var AttributeGroupManager = function()
  {};
  AttributeGroupManager["_sharedCategories"] = {};
  AttributeGroupManager["_sharedAttributes"] = {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroupManager, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager');
  
  /**
   *  Resets attribute groups saved on given amx node.
   *  @param amxNode amx node     
   */  
  AttributeGroupManager.reset = function(amxNode) {
    amxNode["_attributeGroups"] = [];
  };
  
  /**
   *  Initializes context for attribute group processing.
   *  @param context context to be initialized     
   */  
  AttributeGroupManager.init = function(context) {
    context['_attributeGroupsInfo'] = {};
    context['_attributeGroupsInfo']['dataItems'] = [];
  };
  
  /**
   *  Returns true if context is initialized, otherwise returns false.
   *  @param context context
   *  @return true if context is initialized, otherwise returns false         
   */  
  AttributeGroupManager.isContextInitialized = function(context) {
    return context['_attributeGroupsInfo'] !== undefined;
  };
  
  /**
   *  Returns true if amx node is initialized, otherwise returns false.
   *  @param node amx node
   *  @return true if amx node is initialized, otherwise returns false         
   */
  AttributeGroupManager.isAmxNodeInitialized = function(node) {
    return node['_attributeGroups'] !== undefined;
  };
  
  /**
   *  Processes given attribute groups node and saves result into the context.
   *  @param attrGroupsNode attribute groups node
   *  @param amxNode amx node
   *  @param context context            
   */  
  AttributeGroupManager.processAttributeGroup = function(attrGroupsNode, amxNode, context) {
    if(!AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.FINE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return;
    }
    
    var attrGrp = AttributeGroupManager.findGroupById(amxNode, AttributeGroupManager._getAttributeGroupId(attrGroupsNode));
    
    if(attrGrp == null) {
      attrGrp = AttributeGroupManager._createGroup(amxNode, attrGroupsNode); 
      amxNode['_attributeGroups'].push(attrGrp);
    }
    // process attribute groups node instance and return processing information (applied rules, category index used etc.)
    var nodeInfo = attrGrp.processItem(attrGroupsNode);

    if(!context['_itemAttrGroups']) context['_itemAttrGroups'] = [];

    // save attribute group together with the processing information into the context
    var markerAttrGroups = context['_itemAttrGroups'];
    markerAttrGroups.push({
      'attrGroup' : attrGrp, 'nodeInfo' : nodeInfo
    });
  };
  
  /**
   *  Registers data item for further processing. Takes result of processAttributeGroup function, attaches it to the data item and 
   *  registers given data item so that attribute groups can be applied on it.
   *  @param context context
   *  @param dataItem data item
   *  @param config data item configuration, instance of DataItemConfig class           
   */  
  AttributeGroupManager.registerDataItem = function(context, dataItem, config) {
    if(!AttributeGroupManager.isContextInitialized(context)) {
      adf.mf.log.Application.logp(adf.mf.log.level.FINE, "AttributeGroupManager", "registerDataItem", "Manager not initialized.");
      return;
    }
    
    // detach processed attribute groups
    var itemAttrGroups = AttributeGroupManager.detachProcessedAttributeGroups(context);
    // and attach them to given data item
    dataItem['__attrGroups'] = itemAttrGroups;
    // together with this data item configuration
    dataItem['__dataItemConfiguration'] = config;
    // and register given data item
    context['_attributeGroupsInfo']['dataItems'].push(dataItem);
  };
  
  /**
   *  Detaches result of AttributeGroupManager.processAttributeGroup function from the context and returns it. Once corresponding data item can be registered, the detached
   *  result must be attached using AttributeGroupManager.attachProcessedAttributeGroups function so that AttributeGroupManager.registerDataItem
   *  function can be called.
   *  @param context context
   *  @return result of AttributeGroupManager.processAttributeGroup function                 
   */  
  AttributeGroupManager.detachProcessedAttributeGroups = function(context) {
    var processedGroups = context['_itemAttrGroups'] ? context['_itemAttrGroups'].slice(0) : [];
    context['_itemAttrGroups'] = [];
    return processedGroups;
  };
  
  /**
   *  Attaches result of AttributeGroupManager.processAttributeGroup function to the context so that corresponding data item can be registered
   *  using AttributeGroupManager.registerDataItem function.
   *  @param context context
   *  @param detachedGroups detached groups                
   */
  AttributeGroupManager.attachProcessedAttributeGroups = function(context, detachedGroups) {
    context['_itemAttrGroups'] = detachedGroups;
  };
  
  /**
   *  Applies attribute groups on registered data items. 
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   *  @param context context           
   */  
  AttributeGroupManager.applyAttributeGroups = function(amxNode, attributeGroupConfig, context) {
    if(!AttributeGroupManager.isContextInitialized(context) || !AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.FINE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return;
    }
    
    var AttributeGroup = adf.mf.internal.dvt.common.attributeGroup.AttributeGroup;
    
    // retrieve data items to be processed
    var dataItems = context['_attributeGroupsInfo']['dataItems'];
    var infos, dataItemConfig, attrGroup, dataItem;
    
    // configure attribute groups so that they can be applied on data items
    AttributeGroupManager._configureAttributeGroups(amxNode, attributeGroupConfig);
    
    // process registered data items
    if(dataItems.length > 0) {
      for(var i=0; i < dataItems.length; i++) {
        // get item
        dataItem = dataItems[i];
        // get all attribute groups that should be applied on the item together with information used to do the processing (applied rules, category index used etc.) 
        infos = dataItem['__attrGroups'];
        // get data item configuration
        dataItemConfig = dataItem['__dataItemConfiguration'];
        if (infos && infos.length > 0) 
        {
          // last attribute group wins -> reverse processing of the array
          // when particular attribute group sets a value for given type other attribute groups are not applied for given type 
          for (var j = infos.length - 1; j >= 0; j--) 
          {
            // get attribute group
            attrGroup = infos[j]['attrGroup'];
            // get information used to do the processing (applied rules, category index used etc.)
            nodeInfo = infos[j]['nodeInfo'];
            
            // apply attribute group on given data item
            var processingInfo = {
              'nodeInfo' : nodeInfo,
              'config' : dataItemConfig
            } 
            attrGroup.applyGroup(amxNode, dataItem, processingInfo, attributeGroupConfig); 
          }
        }
        // apply default values
        AttributeGroup.applyDefaultValues(amxNode, dataItem, dataItemConfig, attributeGroupConfig); 
        
        delete dataItem['__attrGroups'];
        delete dataItem['__dataItemConfiguration'];
      }
    }
    
    delete context['_attributeGroupsInfo']['dataItems'];
    delete context['_attributeGroupsInfo'];
  };
  
  /**
   *  Find attribute group by id.
   *  @param amxNode amx node
   *  @param id attribute group id
   *  @return attribute group with given id or null if no such group exists           
   */  
  AttributeGroupManager.findGroupById = function(amxNode, id) {
    if(!AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.FINE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return null;
    }
    
    var attrGroups = amxNode['_attributeGroups'];
    var attrGroup = null;
    if(id) {
      for (var g = 0;g < attrGroups.length;g++)
      {
        if (attrGroups[g]['id'] === id) {
          attrGroup = attrGroups[g];
          break;
        }
      }
    }
    return attrGroup;
  };
  
  /**
   *  Returns shared categories by discriminant.
   *  @param discriminant attribute group discriminant
   *  @return shared categories by given discriminant or null if no such shared categories exists           
   */  
  AttributeGroupManager.getSharedCategories = function(discriminant) {
    var sharedCategories = AttributeGroupManager["_sharedCategories"];
    return sharedCategories[discriminant];
  };
  
  AttributeGroupManager.observeSharedCategories = function(discriminant, callback) {
    var sharedCategories = AttributeGroupManager["_sharedCategories"];
    var instance = sharedCategories[discriminant];
    if(!instance) {
      instance = new adf.mf.internal.dvt.common.attributeGroup.Categories();
      AttributeGroupManager["_sharedCategories"][discriminant] = instance;
    }

    instance.observe(callback);
  };
  
  /**
   *  Adds shared category by discriminant.
   *  @param discriminant shared attribute group discriminant
   *  @param category category value to be added
   *  @param label category label to be added
   *  @return index of given category in the shared categories array       
   */  
  AttributeGroupManager.addSharedCategory = function(discriminant, category, label) {
    var sharedCategories = AttributeGroupManager["_sharedCategories"];
    var instance = sharedCategories[discriminant];
    if(!instance) {
      instance = new adf.mf.internal.dvt.common.attributeGroup.Categories();
      AttributeGroupManager["_sharedCategories"][discriminant] = instance;
    }
    return instance.addCategory(category, label);
  };
  
  /**
   *  Returns shared attribute by discriminant.
   *  @param discriminant shared attribute group discriminant
   *  @param attributeName shared attribute name (e.g. minValue)
   *  @return shared attribute or null if no attribute exists for given name
   */
  AttributeGroupManager.getSharedAttribute = function(discriminant, attributeName) {
    if (AttributeGroupManager['_sharedAttributes'][discriminant])
    {
      return AttributeGroupManager['_sharedAttributes'][discriminant][attributeName];
    };
    return null;
  };
  
  /**
   *  For given discriminant and attribute name adds given attribute to shared attributes.
   *  @param discriminant shared attribute group discriminant
   *  @param attributeName shared attribute name (e.g. minValue)
   *  @param value value
   */
  AttributeGroupManager.addSharedAttribute = function(discriminant, attributeName, value) {
    var sharedAttributes = AttributeGroupManager['_sharedAttributes'][discriminant];  
    if (!sharedAttributes)
    {
      sharedAttributes = {};
    }
    sharedAttributes[attributeName] = value;

    AttributeGroupManager['_sharedAttributes'][discriminant] = sharedAttributes;
  };
  
  /**
   *  For given discriminant returns true if it has been already initialized or false otherwise.
   *  @param discriminant shared attribute group discriminants
   *  @return true if it has been already initialized or false otherwise.
   */
  AttributeGroupManager.isSharedGroupInitialized = function(discriminant) {
    return (AttributeGroupManager['_sharedAttributes'][discriminant] != undefined && AttributeGroupManager['_sharedAttributes'][discriminant]['initialized'] == true);
  }
  
  /**
   *  For given discriminant sets that its configuration is done.
   *  @param discriminant shared attribute group discriminants
   */
  AttributeGroupManager.setSharedGroupInitialized = function(discriminant) {
    if (!AttributeGroupManager['_sharedAttributes'][discriminant])
    {
      AttributeGroupManager['_sharedAttributes'][discriminant] = {};
    }
    AttributeGroupManager['_sharedAttributes'][discriminant]['initialized'] = true;
  }
  
  /**
   *  Creates attribute group, initializes it and returns it.
   *  @param amxNode amx node
   *  @param attrGroupsNode attribute groups node
   *  @return created attribute group           
   */  
  AttributeGroupManager._createGroup = function(amxNode, attrGroupsNode) {
    var ContinuousAttributeGroup = adf.mf.internal.dvt.common.attributeGroup.ContinuousAttributeGroup;
    var DiscreteAttributeGroup = adf.mf.internal.dvt.common.attributeGroup.DiscreteAttributeGroup;
  
    var attrGrp;
    if(attrGroupsNode.getAttribute("attributeType") === "continuous") {
      attrGrp = new ContinuousAttributeGroup();
    } else {
      attrGrp = new DiscreteAttributeGroup();
    }
    attrGrp.Init(amxNode, attrGroupsNode);
    return attrGrp;
  };
  
  /**
   *  Returns id of given attribute groups node.
   *  @param attrGroupsNode attribute groups node
   *  @return id of given attribute groups node or null if no id is defined for this node       
   */  
  AttributeGroupManager._getAttributeGroupId = function(attrGroupsNode) {
    var id = null;
    if (attrGroupsNode.isAttributeDefined('id'))
    {
      id = attrGroupsNode.getAttribute('id');
    }
    return id;
  };
  
  /**
   *  Configures all attribute groups saved on given amxNode and passes given attribute group configuration to each of them.
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute group configuration        
   */  
  AttributeGroupManager._configureAttributeGroups = function(amxNode, attributeGroupConfig) {
    var attrGroups = amxNode['_attributeGroups'];
    var discriminant; 
    for (var i = 0;i < attrGroups.length; i++)
    {
      discriminant = attrGroups[i]['discriminant'];
      if(discriminant && !AttributeGroupManager.isSharedGroupInitialized(discriminant)) {
        attrGroups[i].setSharedAttributesUpdateAllowed(true);
      }
      
      attrGroups[i].configure(amxNode, attributeGroupConfig);
      
      if(attrGroups[i].isSharedAttributesUpdateAllowed()) {
        AttributeGroupManager.setSharedGroupInitialized(discriminant);
        attrGroups[i].setSharedAttributesUpdateAllowed(false);
      }
    }
  };
  
  /**
   *  Returns all attribute groups saved on given attribute groups node.
   *  @param amxNode amx node
   *  @param context context
   *  @return all attribute groups saved on given amx node
   */  
  AttributeGroupManager.getAttributeGroups = function(amxNode, context) {
    return amxNode['_attributeGroups'];
  };
  
  /**
   *  Adds descriptions of attribute groups associated with given amx node to given dest object.
   *  If attrName is specified it overrides default 'attributeGroups' dest object attribute name.
   *  @param amxNode amx node
   *  @param context context
   *  @param dest destination object
   *  @param attrName optional attribute name
   */  
  AttributeGroupManager.addDescriptions = function(amxNode, context, dest, attrName) {
    var groups = AttributeGroupManager.getAttributeGroups(amxNode, context);
    if(groups)
    {
      attrName = attrName ? attrName : 'attributeGroups';
      dest[attrName] = [];
      for (var i = 0; i < groups.length; i++)
      {
        dest[attrName].push(groups[i].getDescription());
      }
    }
  }
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    AttributeProcessor.js
 */
(function(){   
  adf.mf.internal.dvt.AttributeProcessor = 
    {
      'TEXT' : 
        function (value)
        {
          if(value !== null)
          {
            return '' + value;
          } 
          return undefined;
        },
      'BOOLEAN' : 
        function (value)
        {
          return adf.mf.api.amx.isValueTrue(value);
        },
      'ON_OFF' : 
        function (value)
        {
          return adf.mf.api.amx.isValueTrue(value) ? 'on' : 'off';
        },
      'INTEGER' : 
        function (value)
        {
          return value === null ? 0 : parseInt(value);
        },
      'FLOAT' : 
        function (value)
        {
          return value === null ? 0.0 : parseFloat(value);
        },
      'PERCENTAGE' : 
        function (value)
        {
          return _processPercentageAttribute(value, true);
        },
      'PERCENTAGE2' : 
        function (value)
        {
          return _processPercentageAttribute(value, false);
        },
      'DATETIME' :
        function (value)
        {
          return _convertDate(value);
        },
      'ROWKEYARRAY' :
        function (value)
        {
          return _processStringArray(value, false);
        },
      'STRINGARRAY' :
        function (value)
        {
          return _processStringArray(value, true);
        },
      'RATING_STEP' :
        function (value)
        {
          var retVal;
          if (value !== null)
          {
            if (value === 'full')
              retVal = 1.0;
            else if (value === 'half')
              retVal = 0.5;
            else
              retVal = parseFloat(value);
            if (!isNaN(retVal))
              return retVal;
          }
          return undefined;
        },
      'GAUGE_STEP' :
        function (value)
        {
          var retVal;
          if (value !== null)
          {
            retVal = parseFloat(value);
            if (!isNaN(retVal))
              return retVal;
          }
          return undefined;
        }
    };
    
  /**
   * Parses the string attribute that can have value 0.0-1.0 or 0.0%-100.0% and 
   * returns float 0.0-1.0, in case of any error 1.0  
   *
   * parameters
   *
   * @param attribute - string that can be 0.0-1.0 or 0.0%-100.0%
   * @param normalize - if true, attribute will be normalized to 0.0-1.0 interval
   * @return float 0.0-1.0, in case of any error 1.0
   *
   */
  var _processPercentageAttribute = function (attribute,normalize) 
  {
    // result, default value
    var fl = 1.0;
    // is attribute percentage
    var percentage = false;
    var attributeLength;
  
    if (attribute !== undefined && attribute !== null)
    {  
      // trim attribute
      attribute = attribute.replace(/(^\s*)|(\s*$)/g, '');
      // number of characteres of attribute
      attributeLength = attribute.length - 1;
      
      // is the attribute percentage
      if (attribute.charAt(attributeLength) === '%') 
      {
        // set flag
        percentage = true;
        // remove percentage character
        attribute = attribute.substr(0, attributeLength);
      }
    
      // try to parse float value from first part of attribute without '%'
      fl = parseFloat(attribute);
      
      // is parsed number valid?
      if (!isNaN(fl)) 
      {
        // convert percent to number
        if (percentage) fl /= 100.0;
        if (normalize) {
          // check if number is 0.0-1.0
          if (fl < 0.0 || fl > 1.0) fl = 1.0;
        }
      }
      else 
        // any error
        fl = 1.0;
    } 
    
    return fl;
  };
  
  /**
   * Converts an ISO 8601 encoded date string to a timestamp
   *
   * @param dateStr a string containing a date/time (supposedly in ISO 8601 format)
   * @return a converted date as a timestamp, or the original date string, if the conversion failed
   */
  var _convertDate = function (dateStr)
  {
    var date = new Date(dateStr);

    if (!isNaN(date))
    {
      return date.getTime();
    }
    else 
    {
      return dateStr;
    }
  };
  
  /**
   * parses an array of strings or numbers. The input can be specified as an array or
   * a string separated with comma or whitespace
   *
   * @param {Object} strings input list
   * @param {boolean} convertNumber input list
   * @return {Array} array of strings
   */
  var _processStringArray = function (strings, convertNumber)
  {
    var result = [];
    
    if (!strings)
    {
      return result;
    }
    
    if (strings instanceof Array)
    {
      // already an array, just return a copy 
      result = strings.slice(0);
    }
    // parse selection in case that it is in a string format
    else if (typeof strings === "string")
    {
      if (strings.indexOf(",") >  -1)
      {
        result = strings.split(",");
      }
      else if (strings.indexOf(" ") >  - 1)
      {
        result = strings.split(" ");
      }
      else 
      {
        result = [strings];
      }
    }
    else if (typeof strings === "number")
    {
      if (convertNumber)
      {
        result = ['' + strings];
      }
      else
      {
        result = [strings];
      }
    }
    return result;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    StyleProcessor.js
 */
(function ()
{  
  adf.mf.internal.dvt.StyleProcessor = 
  {
    'VISIBILITY' :
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['visibility'] === 'hidden' ? 'off' : 'on';
      },
    'CSS_TEXT' : 
      function(node, styleString)
      {
          var ignoreProperties = {};
          if (node) {
            if (hasClassName (node, "dvtm-gaugeMetricLabel") &&
                hasClassName (node.parentNode, "dvtm-ledGauge")
            ) {
              ignoreProperties ['font-size'] = true;
              ignoreProperties ['color'] = true;
            }
            if (hasClassName (node, "dvtm-chartSliceLabel") ||
                hasClassName (node, "dvtm-treemapNodeLabel") ||
                hasClassName (node, "dvtm-sunburstNodeLabel")
            ) {
              ignoreProperties ['color'] = true;
            }
          }
          var nodeStyle = _getComputedStyle(node);
          return _mergeOptionsAndDivStyle(node, nodeStyle, styleString, false, ignoreProperties);
      },
    'CSS_TEXT_TR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyleTr(node, nodeStyle, styleString);
      },
    'CSS_TEXT_WITH_BORDER_COLOR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        styleString = _mergeOptionsAndDivStyle(node, nodeStyle, styleString);
        return styleString;
      },      
    'BACKGROUND' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('background-color');
      },
    'BORDER_COLOR' : 
      function(node, styleString) 
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('border-bottom-color');
      },
    'BORDER_COLOR_TOP' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('border-top-color');
      },
    'BORDER_RADIUS' : 
      function(node, styleString) 
      {
        var nodeStyle = _getComputedStyle(node);
        var value = nodeStyle.getPropertyValue('border-bottom-radius');
        if (!value) return undefined;
        return value;
      },
    'COLOR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('color');
      },
    'OPACITY' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return +nodeStyle.getPropertyValue('opacity');
      },
    'BORDER_STYLE' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('border-bottom-style');
      },
    'BOTTOM_BORDER_WIDTH' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('border-bottom-width');
      },

    'CSS_BACK' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyle(node, nodeStyle, styleString, true);
      },
    'TOP_BORDER_WHEN_WIDTH_GT_0PX' :
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        if(nodeStyle.getPropertyValue('border-bottom-width') === '0px')
        {
          return undefined;
        }
        return nodeStyle.getPropertyValue('border-top-color');
      },
    'CSS' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyle(node, nodeStyle, styleString);
      },
    'WIDTH' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle.getPropertyValue('width');
      }
  }

  function hasClassName (node, className) {
    var classList = node.classList;
    if (!classList) return false;
    for (var i = 0; i < classList.length; i++) {
      if (classList [i] === className)
        return true;
    }
    return false;
  }
  
  adf.mf.internal.dvt.ROOT_NODE_STYLE = '_self';
  
  var _getComputedStyle = function (node)
  {
    return window.getComputedStyle(node, null);
  }
  
  var _buildCssBackStyleString = function (divStyle)
  {
    var styleString = "";
    var bbColor = divStyle.getPropertyValue('border-bottom-color');
    if (bbColor)
    {
      styleString += "border-color: " + bbColor + ";";
    }
    
    // border without border-style is always nonsense (with width 0px)
    var bbWidth = divStyle.getPropertyValue('border-bottom-width');
    var bStyle = divStyle.getPropertyValue('border-style');
    if (bbWidth && (bStyle && bStyle !== 'none'))
    {
      styleString += "border-width: " + bbWidth + ";";
    }
    
    var bgColor = divStyle.getPropertyValue('background-color');
    if (bgColor)
    {
      styleString += "background-color: " + bgColor + ";";
    }
    
    return styleString;
  }
  
  /**
   * build css style string
   */
  var _buildTextCssStyleString = function (divStyle, ignoreProperties)
  {   
    var styleString = "";
  
    var fFamily = divStyle.getPropertyValue('font-family');
    var fSize = divStyle.getPropertyValue('font-size');
    var fWeight = divStyle.getPropertyValue('font-weight');
    var fColor = divStyle.getPropertyValue('color');
    var fStyle = divStyle.getPropertyValue('font-style');
    var fWhiteSpace = divStyle.getPropertyValue('white-space');
  
    if (fFamily)
    {
      styleString += "font-family: " + fFamily + ";";
    }
    if (fSize && !ignoreProperties ['font-size'])
    {
      var nSize = parseFloat(fSize);
      if (nSize >= 1) {
        styleString += "font-size: " + fSize + ";";
      }
    }
    if (fWeight)
    {
      styleString += "font-weight: " + fWeight + ";";
    }
    if (fColor && !ignoreProperties ['color'])
    {
      styleString += "color: " + fColor + ";";
    }
    if (fStyle)
    {
      styleString += "font-style: " + fStyle + ";";
    }
    if (fWhiteSpace && fWhiteSpace !== 'normal')
    {
      styleString += "white-space: " + fWhiteSpace + ";";
    }
    return styleString;
  }
  
  var _mergeOptionsAndDivStyleTr = function (cssDiv, cssDivStyle, optionsStyle)
  {
    if(!cssDiv) 
    {
      return optionsStyle;  
    }
    
    var oldStyle;
    if(optionsStyle) 
    {
      oldStyle = cssDiv.getAttribute("style");
      cssDiv.setAttribute("style", oldStyle + ";" + optionsStyle);
    }
    var styleString = '';
    var btColor = cssDivStyle.getPropertyValue('border-top-color');
    var bbColor = cssDivStyle.getPropertyValue('border-bottom-color');
    if (btColor)
    {
      styleString += "-tr-inner-color: " + btColor + ";";
    }
    if (bbColor)
    {
      styleString += "-tr-outer-color: " + bbColor + ";";
    }
    return styleString;
  }  

  /**
   * Merges style on div with css text in optionsStyle.
   * 
   * @param cssDiv element with style class or with some default style
   * @param optionsStyle extending CSS text style
   * @return merged CSS text style
   * @private
   * @ignore
   */
  _mergeOptionsAndDivStyle = function(cssDiv, cssDivStyle, optionsStyle, back, ignoreProperties)
  {     
    if (!ignoreProperties)
      ignoreProperties = {};
    
    if(!cssDiv) 
    {
      return optionsStyle;  
    }
    
    var oldStyle;
    if(optionsStyle) 
    {
      oldStyle = cssDiv.getAttribute("style");
      cssDiv.setAttribute("style", oldStyle + ";" + optionsStyle);
    }      
    
    var styleString = '';
    
    if(back !== true)
    {
      styleString += _buildTextCssStyleString(cssDivStyle, ignoreProperties);
    }
    
    if(back !== false)
    {
      styleString += _buildCssBackStyleString(cssDivStyle);
    }
    if(oldStyle)
    {
      cssDiv.setAttribute("style", oldStyle);
    }
    return styleString;
  }

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    BaseRenderer.js
 */
(function ()
{
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;
  /**
   * Class describes how the renderers should be processed to achive unified processing of
   * all attributes and child amx nodes.
   */
  var BaseRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseRenderer, 'adf.mf.api.amx.TypeHandler', 'adf.mf.internal.dvt.BaseRenderer');

  BaseRenderer.DATA_OBJECT = '_optionsObj';
  var DATA_DIRTY = '_optionsDirty';

  /**
   * @param amxNode
   * @return object that describes atributes of the component.
   */
  BaseRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    return {};
  };

  /**
   * @param {String} facetName an optional name of the facet containing the items to be rendered
   * @return object that describes child renderers of the component.
   */
  BaseRenderer.prototype.GetChildRenderers = function (facetName)
  {
    return {};
  };

  BaseRenderer.prototype.ProcessComponent = function (amxNode, id)
  {
    // prepare processing context
    var context = this.CreateContext(amxNode, null, null);
    // process attributes of parameter amxNode and translate its attributes
    // to the attributes on the options object
    this._processAttributes(amxNode, context);
    // process children of the amxNode and let them set options object
    this._processChildren(amxNode, context);
  };

  BaseRenderer.prototype.RefreshComponent = function (amxNode, attributeChanges, descendentChanges)
  {
    // prepare processing context
    var context = this.CreateContext(amxNode, attributeChanges, descendentChanges ? descendentChanges : null);
    // process attributes of parameter amxNode and translate its attributes
    // to the attributes on the options object
    this._processAttributes(amxNode, context);
    // process children of the amxNode and let them set options object
    this._processChildren(amxNode, context);
  };

  /**
   * process chart's children found on the amxNode
   *
   * @param amxNode current amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype._processAttributes = function (amxNode, context)
  {
    var options = this.GetDataObject(amxNode);
    // call BaseRenderer's ProcessAttributes function to resolve attributes.
    var changed = this.ProcessAttributes(options, amxNode, context);
    if (changed)
    {
      this.SetOptionsDirty(amxNode, true);
    }
  };

  /**
   * process chart's children found on the amxNode
   *
   * @param amxNode current amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype._processChildren = function (amxNode, context)
  {
    // create new context for processing of the child nodes
    var options = this.GetDataObject(amxNode);
    // call CompositeRenderer's ProcessChildren function to resolve child nodes.
    var changed = this.ProcessChildren(options, amxNode, context);

    if (changed)
    {
      this.SetOptionsDirty(amxNode, true);
    }
  };

  /**
   * @param amxNode current amxNode
   * @param attributeChanges
   * @param descendentChanges
   * @return context for processing of the attributes and children
   */
  BaseRenderer.prototype.CreateContext = function (amxNode, attributeChanges, descendentChanges)
  {
    var context = 
    {
      'amxNode' : amxNode, '_attributeChanges' : attributeChanges, '_descendentChanges' : descendentChanges
    };

    return context;
  };

  BaseRenderer.prototype.GetDataObject = function (amxNode)
  {
    var data = amxNode.getAttribute(BaseRenderer.DATA_OBJECT);
    if (!data)
    {
      data = {};
      this.SetDataObject(data);
    }
    return data;
  };

  BaseRenderer.prototype.SetDataObject = function (amxNode, data)
  {
    amxNode.setAttributeResolvedValue(BaseRenderer.DATA_OBJECT, data);
  };

  BaseRenderer.prototype.GetOptions = function (options)
  {
    return options;
  };

  BaseRenderer.prototype.SetOptionsDirty = function (amxNode, value)
  {
    if (value === true)
    {
      amxNode.setAttributeResolvedValue(DATA_DIRTY, true);
    }
    else 
    {
      amxNode.setAttributeResolvedValue(DATA_DIRTY, false);
    }
  };

  BaseRenderer.prototype.IsOptionsDirty = function (amxNode)
  {
    if (amxNode.getAttribute(DATA_DIRTY))
    {
      return true;
    }
    return false;
  };

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    options = this.GetOptions(options);
    var attributeMap = this.GetAttributesDefinition(amxNode);
    var changed = false;
    var that = this;

    var keys = attributeMap ? Object.keys(attributeMap) : [];
    for (var i = 0, length = keys.length;i < length;i++)
    {
      var attribute = keys[i];

      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, that.getTypeName(), "ProcessAttributes", "Attribute changed: " + attribute);

      var definition = attributeMap[attribute];
      var path = new JSONPath(options, definition['path']);
      var attrChanged = false;

      var value = undefined;
      if (adf.mf.environment.profile.dtMode && definition['dtvalue'])
      {
        value = definition['dtvalue'];
      }
      else if (amxNode.isAttributeDefined(attribute))
      {
        value = amxNode.getAttribute(attribute);
        if (adf.mf.environment.profile.dtMode && typeof value === 'string' && value.indexOf('#{') >  - 1)
        {
          value = undefined;
        }

        if (value !== undefined && definition['type'])
        {
          value = definition['type'](value);
        }
      }

      if (value !== undefined)
      {
        attrChanged = path.setValue(value);
      }
      else if (definition['default'] !== undefined)
      {
        attrChanged = path.setValue(definition['default']);
      }

      changed = changed || attrChanged;
    }
    return changed;
  };

  /**
   * @param amxNode current amxNode
   * @param context rendering context
   * @return list of child nodes of the amxNode
   */
  BaseRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getChildren(context['_currentFacet']);
  };

  BaseRenderer.EMPTY_CHANGES = new adf.mf.api.amx.AmxAttributeChange();

  /**
   * Function processes supported childTags which are on amxNode.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context renderingcontext
   */
  BaseRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var renderers = this.GetChildRenderers();
    // skip processing when component has no child renderers
    if (renderers)
    {
      var facets;
      if (this.GetFacetNames)
      {
        facets = this.GetFacetNames();
      }
      else 
      {
        facets = [null];
      }
      options = this.GetOptions(options);
      var i, j, length;
      var forProcessing = [];
      var originalChanges = context['_attributeChanges'];
      for (j = 0;j < facets.length;j++)
      {
        context['_currentFacet'] = facets[j];
        var children = this.GetChildrenNodes(amxNode, context);
        context['_currentFacet'] = null;
        var occurrences = 
        {
        };
        // at the first iteration find only supported child nodes
        for (i = 0, length = children.length;i < length;i++)
        {
          var tagName = children[i].getTag().getName();
          var rendererObject = renderers[tagName];
          // find if there is a renderer for current child node
          if (rendererObject && rendererObject['renderer'])
          {
            var renderer = rendererObject['renderer'];
            // skip renderer for tag whose 'rendered' attribute is false,
            // unless the renderer has a special handler for it
            var attributeMap = renderer.GetAttributesDefinition(children[i]);
            if (children[i].isAttributeDefined('rendered') 
                     && adf.mf.api.amx.isValueFalse(children[i].getAttribute('rendered'))
                     && attributeMap['rendered'] === undefined)
            {
              continue;
            }
            // check if how many children can be nested in this amxNode
            var maxOccurrences = renderer['maxOccurrences'];
            if (maxOccurrences !== undefined && maxOccurrences !== null)
            {
              if (occurrences[tagName] === undefined)
              {
                occurrences[tagName] = 0;
              }
              // check if function can still process this child node
              if (occurrences[tagName] < maxOccurrences)
              {
                occurrences[tagName] = occurrences[tagName] + 1;
              }
              else 
              {
                adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "Too many occurrences of the node '" + tagName + "'!");
                continue;
              }
            }
            // add job to be processed
            forProcessing.push(
            {
              'r' : renderer, 'c' : children[i], 'p' : (rendererObject['order'] === undefined ? 0 : rendererObject['order']), 'o' : i
            });
          }
          else 
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There is no renderer for node '" + tagName + "'!");
          }
        }
      }
      // sort all nodes which are supposed to be rendered by priority to
      // ensure proper child resolution and dependencies
      forProcessing.sort(function (a, b)
      {
        return (a['p'] === b['p']) ? a['o'] - b['o'] : a['p'] - b['p'];
      });
      // call attribute processing and child processing on each child which should be rendered
      var changed = false;
      for (i = 0, length = forProcessing.length;i < length;i++)
      {
        if (forProcessing[i]['r'].ProcessAttributes)
        {
          var changes = context['_attributeChanges'];
          var descendentChanges = context['_descendentChanges'];
          if (descendentChanges)
          {
            context['_attributeChanges'] = descendentChanges.getChanges(forProcessing[i]['c']);
            if (!context['_attributeChanges'])
            {
              context['_attributeChanges'] = BaseRenderer.EMPTY_CHANGES;
            }
          }
          else if (changes)
          {
            context['_attributeChanges'] = BaseRenderer.EMPTY_CHANGES;
          }
          changed = changed | forProcessing[i]['r'].ProcessAttributes(options, forProcessing[i]['c'], context);
          context['_attributeChanges'] = changes;
        }
        else 
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + forProcessing[i]['c'].getTag().getName() + "'!");
        }
        if (forProcessing[i]['r'].ProcessChildren)
        {
          changed = changed | forProcessing[i]['r'].ProcessChildren(options, forProcessing[i]['c'], context);
        }
        else 
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There is a missing ProcessChildren method on renderer for '" + forProcessing[i]['c'].getTag().getName() + "'!");
        }
      }
      return changed;
    }
    else 
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There are no child renderers for node '" + amxNode.getTag().getName() + "'!");
      return false;
    }
  };

  /**
   * Helper that provides quick array filtering.
   * 
   * @param array {array} array of the items
   * @param test {function} callback that tests the item in the array (e.g. function(value, index, array){return true;});
   * @return {array} new instance of the array with items that passes test in same order as in the source array
   */
  BaseRenderer.prototype.filterArray = function(array, test)
  {
    var match = [];
    if (array)
    {
      for (var i = 0, size = array.length; i < size; i++)
      {
        if (test(array[i], i, array))
        {
          match[match.length] = array[i];
        }
      }
    }

    return match;
  };

  BaseRenderer.prototype.findAllAmxNodes = function (root, clientIds)
  {
    var result = [];
    if (clientIds)
    {
      var found = 0;
      root.visitChildren(new adf.mf.api.amx.VisitContext(), function (visitContext, amxNode)
      {
        if (clientIds.indexOf(amxNode.getId()) > -1)
        {
          result.push(amxNode);
          found++;
          if (found === clientIds.length)
          {
            return adf.mf.api.amx.VisitResult['COMPLETE'];
          }
          return adf.mf.api.amx.VisitResult['REJECT'];
        }
        return adf.mf.api.amx.VisitResult['ACCEPT'];
      });
    }
    return result;
  };

  BaseRenderer.prototype.findAmxNode = function (root, clientId)
  {
    var itemNode = null;
    if (clientId)
    {
      root.visitChildren(new adf.mf.api.amx.VisitContext(), function (visitContext, amxNode)
      {
        if (amxNode.getId() === clientId)
        {
          itemNode = amxNode;
          return adf.mf.api.amx.VisitResult['COMPLETE'];
        }
        return adf.mf.api.amx.VisitResult['ACCEPT'];
      });
    }
    return itemNode;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    BaseComponentRenderer.js
 */
(function ()
{
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;

  /**
   * Common ancestor for all top level dvt component renderers which directly interacts with the amx layer.
   *
   * Implemented AMX Interface functions
   *  - create (function contructs component's Options)
   *  - init (function registers listeners for new component)
   *  - postDisplay (function renders chart itself)
   *  - refresh (function refreshes component's Options)
   *  - destroy (function removes registered listeners from init function)
   */
  var BaseComponentRenderer = function ()
  {};

  // renderer extend adf.mf.internal.dvt.BaseRenderer which means that this renderer supports
  // rendering of the child tags
  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseComponentRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.BaseComponentRenderer');

  adf.mf.internal.dvt.AMX_NAMESPACE = 'http://xmlns.oracle.com/adf/mf/amx';
  adf.mf.internal.dvt.DVT_NAMESPACE = 'http://xmlns.oracle.com/adf/mf/amx/dvt';

  var COMPONENT_INSTANCE = '_jsComponentInstance';

  BaseComponentRenderer.DEFAULT_WIDTH = 300;
  BaseComponentRenderer.DEFAULT_HEIGHT = 200;

  // allow to override default behavior
  BaseComponentRenderer.prototype.isRendered = function (amxNode)
  {
    // first check if this data item should be rendered at all
    var rendered = true;
    var attrValue = amxNode.getAttribute('rendered');
    if (attrValue !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(attrValue))
      {
        rendered = false;
      }
    }
    return rendered;
  };

  /**
   * Function creates component's options, merges them with default styles.
   *
   * @param amxNode
   * @return jquery div element
   */
  BaseComponentRenderer.prototype.render = function (amxNode, id)
  {
    if (amx && amx.testmode === true)
    {
      amxNode.setAttributeResolvedValue('___test.component.rendered', false);
    }
    // set a private flag to indicate whether the node can be populated with contents
    // should an exception occur during data processing, this flag will be set to false
    this._setReadyToRender(amxNode, true);

    try
    {
      // new fresh component so release old toolkit instance if any
      amxNode.setAttributeResolvedValue(COMPONENT_INSTANCE, null);
      // load resource bundles for this component
      this._loadResourceBundles(amxNode);
      // get empty options object
      var options = {};
      // create new options object
      this.InitComponentOptions(amxNode, options);
      // fill newly created object with default and custom styles
      options = this.MergeComponentOptions(amxNode, options);
      // store options object to the amxNode
      this.SetDataObject(amxNode, options);
      // call parent renderer to resolve atributes and childrens
      this.ProcessComponent(amxNode, id);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "create", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "create", "Stack: " + ex.stack);
      }
      else 
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "create", "Exception (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "create", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "create", "Stack: " + ex.stack);
      }
    }
    // create new jquery div element for this amxNode
    return this.SetupComponent(amxNode);
  };

  /**
   * Function initilazes component's dom node and registers listeners for this component.
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.init = function (node, amxNode)
  {
    try 
    {
      // call internal function that performs initialization
      this.InitComponent(node, amxNode);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "init", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "init", "Stack: " + ex.stack);
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "init", "Exception (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "init", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "init", "Stack: " + ex.stack);
      }
    }
  };

  /**
   * Function renders component.
   *
   * Render is skipped when _isReadyToRender function returns false which indicates that some exception occures before
   * this state and there can be some inconsistency in data so all render phase is skipped
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.postDisplay = function (node, amxNode)
  {
    if (this._isReadyToRender(amxNode))
    {
      this._renderComponent(node, amxNode);
    }
  };

  /**
   * Function resets component's options and renderes component.
   *
   * @param amxNode
   * @param attributeChanges changes of current amxNode
   */
  BaseComponentRenderer.prototype.refresh = function (amxNode, attributeChanges, descendentChanges)
  {
    if (amx && amx.testmode === true)
    {
      amxNode.setAttributeResolvedValue('___test.component.rendered', false);
    }
    // set a private flag to indicate whether the node can be populated with contents
    // should an exception occur during data processing, this flag will be set to false
    this._setReadyToRender(amxNode, true);

    try 
    {
      // reset options object
      this.ResetComponentOptions(amxNode, this.GetDataObject(amxNode), attributeChanges, descendentChanges);
      // call parent renderer to resolve atributes and childrens
      this.RefreshComponent(amxNode, attributeChanges, descendentChanges);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "refresh", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "refresh", "Stack: " + ex.stack);
      }
      else 
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "refresh", "Exception (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "refresh", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "refresh", "Stack: " + ex.stack);
      }
    }
    // find the dom node for amxNode
    if (this._isReadyToRender(amxNode))
    {
      this.renderNode(amxNode);
    }
  };

  BaseComponentRenderer.prototype.renderNode = function (amxNode)
  {
    var node = document.getElementById(this.GetComponentId(amxNode));
    this._renderComponent(node, amxNode);
  };

  /**
   * Function removes registered listeners.
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.destroy = function (node, amxNode)
  {
    this.DestroyComponent(node, amxNode);
  };

/**
 * Returns the Automation object for automated testing
 * 
 * @param {Object} DVT Toolkit component instance
 * @returns {Object} the automation object or null
 */
  BaseComponentRenderer.prototype.GetAutomation = function (componentInstance)
  {
    var automation = null;
    if (componentInstance.getAutomation)
    {
      automation = componentInstance.getAutomation();
    }
    return automation;
  };

/**
 * Type handler callback to obtain a locator for a DOM element under this comp onent
 *
 * @param {Object} amxNode of the component
 * @param {Element} domElement the element
 * @return {string} the locator plus any needed sub-id for the element
 */
 	
  BaseComponentRenderer.prototype.getElementLocator = function (amxNode, domElement)
  {
    var componentInstance = this.GetComponentInstance(null, amxNode);
    if (!componentInstance)
    {
      return null;
    }

    var automation = this.GetAutomation(componentInstance);
    if (!automation)
    {
      return null;
    }

    return automation.getSubIdForDomElement(domElement);
  };
 
/**
  * Type handler callback to obtain a DOM element for a locator/sub-id handled by the component
  *
  * @param {Object} amxNode of the component
  * @param {string} elementLocator the locator plus any needed sub-id for the e lement
  * @return {Element} domElement the DOM element
  */ 
  BaseComponentRenderer.prototype.getElementForLocator = function(amxNode, elementLocator)
  {
    var componentInstance = this.GetComponentInstance(null, amxNode);
    if (!componentInstance)
    {
      return null;
    }
  
    var automation = this.GetAutomation(componentInstance);
    if (!automation)
    {
      return null;
    }

    return automation.getDomElementForSubId(elementLocator);
  };

  // END OF AMX INTERFACE

  /**
   * Function is called in init phase and should initialize shell of the options object
   *
   * @param amxNode
   */
  BaseComponentRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    this.SetOptionsDirty(amxNode, true);
  };

  /**
   * Function is called in refresh phase and should reset the options object according to attributeChanges parameter.
   *
   * @param amxNode
   * @param attributeChanges
   */
  BaseComponentRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    // clear the 'dirty' flag on the options object
    this.SetOptionsDirty(amxNode, false);
  };

  /**
   * @return unique ID of rendered component
   */
  BaseComponentRenderer.prototype.GetComponentId = function (amxNode)
  {
    var id = amxNode.getId();

    if (id === undefined)
    {
      idAttr = '';
    }
    return id;
  };

  /**
   * sets up chart's outer div element
   *
   * @param amxNode
   */
  BaseComponentRenderer.prototype.SetupComponent = function (amxNode)
  {
    // create main div
    var contentDiv = DOMUtils.createDIV();
    // set up basic div's attributes
    var id = this.GetComponentId(amxNode);
    DOMUtils.writeIDAttribute(contentDiv, id);

    var contentDivClass = this.GetContentDivClassName();
    var className = 'dvtm-component';
    if (contentDivClass)
    {
      className = className + ' ' + contentDivClass;
    }
    DOMUtils.writeClassAttribute(contentDiv, className);
    // set inner content of the div with generated html which contains all the helper divs
    var styleClassMap = this.GetStyleClassesDefinition();
    contentDiv.innerHTML = _generateInnerHTML(styleClassMap, amxNode);

    return contentDiv;
  };

  BaseComponentRenderer.prototype.GetContentDivClassName = function ()
  {
    return null;
  };

  var _generateInnerHTML = function (classes, amxNode)
  {
    var innerHtml = '';
    var keys = Object.keys(classes);
    for (var i = 0, length = keys.length; i < length;i++)
    {
      var styleClass = keys[i];

      if (styleClass === adf.mf.internal.dvt.ROOT_NODE_STYLE)
      {
        continue;
      }

      innerHtml += '<div class="';
      var builderFunction = classes[styleClass]['builderFunction'];
      if (builderFunction !== undefined)
      {
        var result = builderFunction(amxNode);
        innerHtml += result;
      }
      else 
      {
        innerHtml += styleClass;
      }
      innerHtml += '" style="display:none;"><\/div>';
    }

    return innerHtml;
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  BaseComponentRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    return {};
  };

  /**
   * @return string path from the window to user specified custom styles.
   */
  BaseComponentRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomComponentStyle';
  };

  /**
   * @return default style object for the component.
   */
  BaseComponentRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return {};
  };

  /**
   * Function fills options object with merged styles from default styles and custom styles.
   * Default styles are returned from GetCustomStyleProperty function and default style object
   * is returne by function GetDefaultStyles
   *
   * @param amxNode amxNode of this component
   */
  BaseComponentRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    // first, apply JSON style properties
    var styleJSON;
    var property = this.GetCustomStyleProperty(amxNode);
    var jsonPath = new JSONPath(window, property);
    var customStyles = jsonPath.getValue();

    if (customStyles !== undefined)
    {
      styleJSON = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(customStyles, this.GetDefaultStyles(amxNode));
    }
    else 
    {
      styleJSON = this.GetDefaultStyles(amxNode);
    }
    // if we got here, assume the options object *will* be modified
    this.SetOptionsDirty(amxNode, true);
    // the 'optionsObject' is a result of the default and custom style
    return adf.mf.internal.dvt.util.JSONUtils.mergeObjects(styleJSON, options);
  };

  /**
   * returns the component's width
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.GetComponentWidth = function (simpleNode, amxNode)
  {
    var width = DOMUtils.getWidth(simpleNode);
    if (width <= 1)
    {
      // width not set or too small, try using parent width instead
      width = DOMUtils.getWidth(simpleNode.parentNode);
    }
   
    return width;
  };

  /**
   * @returns true when component can use extended form of the height determination.
   * We don't want this to happen in case of the components that manage the layout itself
   * or in case that we are the only one component in the parent.
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.IsSmartLayoutCapable = function (simpleNode, amxNode)
  {
    if (amxNode === null || amxNode.getParent() === null)
    {
      return false;
    }
    // try to find cached information about the smart layout
    if (amxNode.getAttribute("__smartLayout") != null)
    {
      return amxNode.getAttribute("__smartLayout");
    }
    // in case that we are the only child don't use smart layout
    if (!simpleNode || !simpleNode.parentNode || simpleNode.parentNode.childNodes.length === 1)
    {
      amxNode.setAttributeResolvedValue("__smartLayout", false);
      return false;
    }
    // filter known cases of the layouts that always wrap component
    // to the extra div but in some cases (transitions for example)
    // can contain two components in one wrapper for short amount of
    // time.
    switch (amxNode.getParent().getTag().getName())
    {
      case 'deck':
      case 'flexLayout':
      case 'panelGroupLayout':
        amxNode.setAttributeResolvedValue("__smartLayout", false);
        return false;
      default :
        amxNode.setAttributeResolvedValue("__smartLayout", true);
        return true;
    }
  };

  /**
   * @param simpleNode components root element
   * @param amxNode AmxNode that represents this component
   * 
   * @returns the component's height
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.GetComponentHeight = function (simpleNode, amxNode)
  {
    // ask component if it can use the complex calculation of the height
    if (this.IsSmartLayoutCapable(simpleNode, amxNode))
    {
      return this._getAugmentedHeight(simpleNode, amxNode);
    }
    // use standard height detection from simple dom node
    var height = DOMUtils.getHeight(simpleNode);
    if (height <= 1)
    {
      // height not set or too small, try using parent height instead
      height = DOMUtils.getHeight(simpleNode.parentNode);
    }
    return Math.floor(height);
  };

  /**
   * @param simpleNode components root element
   * @param amxNode AmxNode that represents this component
   * 
   * @returns the component's height based on the parent size without sizes
   *  of the fixed sized elements
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype._getAugmentedHeight = function (simpleNode, amxNode)
  {
    // height set in fixed units for example px
    var height =  + simpleNode.getAttribute('_userheight');
    if (!height)
    {
      height = 0;
    }

    if (height < 1 && simpleNode.parentNode)
    {
      // height not set or too small, try using parent height instead
      var parentHeight = DOMUtils.getHeight(simpleNode.parentNode);
      var nodePercentage =  + simpleNode.getAttribute('_relativeheight');
      var totalPercentage = nodePercentage;

      var sibblingsAndMe = simpleNode.parentNode.childNodes;
      var myId = simpleNode['id'];
      // subtracts all siblings with fixed width and tries to determine weight of
      // current component by its percentage height
      for (var i = 0; i < sibblingsAndMe.length; i++)
      {
        if (myId !== sibblingsAndMe[i]['id'])
        {
          // relative height in scope of all other components
          var sibblingRelHeight = sibblingsAndMe[i].getAttribute('_relativeheight');
          var sibblingUserHeight =  + sibblingsAndMe[i].getAttribute('_userheight');
          var sibHeight = DOMUtils.getHeight(sibblingsAndMe[i]);
          if ((sibHeight <= 1 || sibblingRelHeight) && !sibblingUserHeight)
          {
            var sibblingNodePercentage =  + sibblingRelHeight;
            if (!sibblingNodePercentage || sibblingNodePercentage <= 0)
            {
              sibblingNodePercentage =  + DOMUtils.parseStyleSize(sibblingsAndMe[i].style.height, true);
            }
            // add relative height of sibbling to total relative height
            totalPercentage = totalPercentage + sibblingNodePercentage;
            parentHeight = parentHeight + sibHeight;
          }
          // substract sibblings height and also its padding, border and margin
          if (sibblingUserHeight)
          {
            sibblingUserHeight =  + sibblingUserHeight;
            parentHeight = parentHeight - sibblingUserHeight;
          }
          else 
          {
            parentHeight = parentHeight - DOMUtils.getOuterHeight(sibblingsAndMe[i]);
          }
        }
      }
      // height is portion of the available parent height without fixed height components divided by weight
      // of this component in scope of all present components with relative height.
      height = parentHeight * (nodePercentage / Math.max(totalPercentage, 100));
    }

    return Math.floor(height);
  };

  /**
   * removes calculated values from component's dom node
   */
  BaseComponentRenderer.prototype.ResetComponentDimensions = function (simpleNode, amxNode)
  {
    // reset all computed values at first
    this._setComputedHeight(amxNode, null);
    this._setComputedWidth(amxNode, null);
    // restore original value of the width in case that
    // the width has been forced because of the zero parent
    // width
    var forcedWidth = amxNode.getAttribute('_forcedWidth');
    if (forcedWidth !== null)
    {
      simpleNode.style.width = forcedWidth;
      amxNode.setAttributeResolvedValue('_forcedWidth', null);
    }

    var forcedHeight = amxNode.getAttribute('_forcedHeight');
    // in case of the smart layout the height is forced to the dom in all cases 
    // and for proper calculation from the parent node we have to set it to 0px
    if (this.IsSmartLayoutCapable(simpleNode, amxNode))
    {
      DOMUtils.setHeight(simpleNode, '0px');
    }
    // restore original value of the height in case that
    // the height has been forced because of the zero parent
    // height - this has not colide with the smart layout behavior
    else if (forcedHeight !== null)
    {
      simpleNode.style.height = forcedHeight;
      amxNode.setAttributeResolvedValue('_forcedHeight', null);
    }
  };

  BaseComponentRenderer.prototype.GetPreferredSize = function (simpleNode, amxNode, width, height)
  {
    return null;
  };

  /**
   * sets newly calculated dimensions to the dom node
   */
  BaseComponentRenderer.prototype.GetComponentDimensions = function (simpleNode, amxNode)
  { 
    // try to get computed width first to prevent
    // dom operations
    var width = this._getComputedWidth(amxNode);
    var height = this._getComputedHeight(amxNode);

    var computed = true;
    if (!width)
    {
      // obtain width from the root simpleNode that nests the component
      // itself
      width = this.GetComponentWidth(simpleNode, amxNode);
      computed = false;
    }
    // try to get computed height first to prevent
    // dom operations
    if (!height)
    {
      // obtain height from the root simpleNode that nests the component
      // itself
      height = this.GetComponentHeight(simpleNode, amxNode);
      computed = false;
    }
    // in case that the fresh new dimensions are calculated 
    // process them and adjust node if needed
    if (!computed)
    {
      var forcedWidth = false;
      var forcedHeight = false;
      // in case that the component supports preferred size try
      // to calculate
      var ps = this.GetPreferredSize(simpleNode, amxNode, width, height);
      if (ps)
      {
        if (ps['w'])
        {
          forcedWidth = true;
          width = ps['w'];
        }

        if (ps['h'])
        {
          forcedHeight = true;
          height = ps['h'];
        }
      }
      // in case that the dom element has near to zero value set the default value
      // we are trying to detect that the parent is zero size container and require child 
      // to define its dimensions
      if (width <= 1)
      {
        width = BaseComponentRenderer.DEFAULT_WIDTH;
      }
      // same as the comment for width above
      if (height < 1)
      {
        height = BaseComponentRenderer.DEFAULT_HEIGHT;
      }
      // in some cases when parent has 0-1px size we need to stretch this div to ensure default component width
      // also set forced width in case that the component has preferred size and this size is applied
      if (forcedWidth || DOMUtils.getWidth(simpleNode) < width)
      {
        amxNode.setAttributeResolvedValue('_forcedWidth', simpleNode.style.width);
        DOMUtils.setWidth(simpleNode, width + 'px');
      }
      // store the node's width
      this._setComputedWidth(amxNode, width);
      // adjust and store the node's height
      this._setComputedHeight(amxNode, height);
      // in case that component is using smart layout set fixed height
      // in every case
      if (this.IsSmartLayoutCapable(simpleNode, amxNode))
      {
        DOMUtils.setHeight(simpleNode, height + 'px');
      }
      // in some cases when parent has 0-1px size we need to stretch this div to ensure default component height
      // also set forced height in case that the component has preferred size and this size is applied
      // this has to not colide with the smart layout behavior
      else if (forcedHeight || DOMUtils.getHeight(simpleNode) < height)
      {
        amxNode.setAttributeResolvedValue('_forcedHeight', simpleNode.style.height);
        DOMUtils.setHeight(simpleNode, height + 'px');
      }
    }
    // calculate width and height of the rendered component inside of the node
    this._adjustStageParameters(this.GetStageId(amxNode), width, height);

    return { 'w' : width, 'h' : height };
  };

  /**
   * checks if the node passed as the first parameter is the ancestor of the
   * node
   *
   * @param ancestorNode  the presumed ancestorNode
   * @param node  a presumed descendant of the ancestorNode
   * @return 'true' if node is a descendant of the ancestorNode
   *
   */
  BaseComponentRenderer.prototype.IsAncestor = function (ancestorNode, node)
  {
    var parentNode = node.parentNode;

    while (parentNode)
    {
      if (parentNode === ancestorNode)
        return true;

      parentNode = parentNode.parentNode;
    }
    return false;
  };

  /**
   * Initialize all dvtm components.
   *
   * @param simpleNode root dom node of this component
   * @param amxNode amxNode of this component
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.InitComponent = function (simpleNode, amxNode)
  {
    // install filsters preventing touch event propagation
    // in case that component should consume it
    this._installEventFilters(simpleNode, amxNode);
    // get user defined dimensions
    var userHeight = DOMUtils.parseStyleSize(simpleNode.style.height);
    var userWidth = DOMUtils.parseStyleSize(simpleNode.style.width);
    // in case of the smart layout save original width and height to the 
    // extra attributes
    if (this.IsSmartLayoutCapable(simpleNode, amxNode))
    {
      // determine if height of this component if fixed or relative
      // we don't have to care about width since it's computed by webview itself properly
      if (userHeight > 0)
      {
        simpleNode.setAttribute('_userheight', userHeight);
      }
      else 
      {
        var nodePercentage = DOMUtils.parseStyleSize(simpleNode.style.height, true);
        simpleNode.setAttribute('_relativeheight', nodePercentage);
      }
    }
    // prepare the initial dimensions for the component
    this.ResetComponentDimensions(simpleNode, amxNode);
    // register the resize handler in case we need to resize the chart later
    // listener should be registered only when at least one dimension is relative
    if (userWidth == 0 || userHeight == 0)
    {
      this.InitResizeHandler(simpleNode, amxNode);
    }
  };

  BaseComponentRenderer.prototype._stopPropagationHandler = function (event)
  {
    event.stopPropagation();
  };

  BaseComponentRenderer.prototype._installEventFilters = function(node, amxNode)
  {
    if (this.PreventsSwipe(amxNode))
    {
      node.addEventListener('mousedown', this._stopPropagationHandler, false);
      node.addEventListener('touchstart', this._stopPropagationHandler, false);
    }
    else 
    {
      node.removeEventListener('mousedown', this._stopPropagationHandler);
      node.removeEventListener('touchstart', this._stopPropagationHandler);
    }
  };

  BaseComponentRenderer.prototype.GetParentResizeCallback = function ()
  {
    if (!this._parentResizeCallback)
    {
      this._parentResizeCallback = function (event)
      {
        var self = event.data['self'];
        var amxNode = event.data['amxNode'];
        var simpleNode = document.getElementById(amxNode.getId());
        var renderCallback = self.GetRenderCallback(amxNode);

        if (!simpleNode || !self.GetComponentInstance(null, amxNode))
        {
          // simpleNode is not in DOM, do not render
          return;
        }

        var oldDim = self.GetComponentDimensions(simpleNode, amxNode);
        self.ResetComponentDimensions(simpleNode, amxNode);

        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, self.getTypeName(), "InitComponent.resize", "Re-rendering component due to a node resize event.");

        var dimensions = self.GetComponentDimensions(simpleNode, amxNode);
        if (oldDim['w'] !== dimensions['w'] || oldDim['h'] !== dimensions['h'])
        {
          // call render callback to rerender component
          renderCallback.call(self, self.GetComponentInstance(simpleNode, amxNode), dimensions['w'], dimensions['h'], amxNode, self.GetStageId(amxNode));
        }
      };
    }
    return this._parentResizeCallback;
  };

  BaseComponentRenderer.prototype.InitResizeHandler = function (simpleNode, amxNode)
  {
    var resizeData = 
    {
      'amxNode' : amxNode, 'self' : this
    };
    // resize called by parent containers
    adf.mf.api.amx.addBubbleEventListener(simpleNode, "resize", this.GetParentResizeCallback(), resizeData);

    var resizeHandler = adf.mf.internal.dvt.util.ResizeHandler.getInstance();
    // add resize callbacks
    resizeHandler.addResizeCallback(amxNode.getId(), this.GetResizeCallback(), this.GetPostResizeCallback(), resizeData);
  };

  BaseComponentRenderer.prototype.GetRenderCallback = function (amxNode)
  {
    return this.RenderComponent;
  };

  BaseComponentRenderer.prototype.GetResizeCallback = function ()
  {
    if (!this._windowResizeCallback)
    {
      this._windowResizeCallback = function (event)
      {
        var activeInstance = event.data['self'];
        var amxNode = event.data['amxNode'];
        var simpleNode = document.getElementById(amxNode.getId());
        // store old dimensions
        var oldHeight = activeInstance._getComputedHeight(amxNode);
        var oldWidth = activeInstance._getComputedWidth(amxNode);
        // reset all computed value at first
        activeInstance.ResetComponentDimensions(simpleNode, amxNode);
        // return old values as a context
        return {'oldwidth' : oldWidth, 'oldheight' : oldHeight};
      };
    }
    return this._windowResizeCallback;
  };

  BaseComponentRenderer.prototype.GetPostResizeCallback = function ()
  {
    if (!this._windowPostResizeCallback)
    {
      this._windowPostResizeCallback = function (event, context)
      {
        var activeInstance = event.data['self'];
        var amxNode = event.data['amxNode'];
        var simpleNode = document.getElementById(amxNode.getId());

        if (!simpleNode)
        {
          // simpleNode is not in DOM, do not render
          return;
        }
        var renderCallback = activeInstance.GetRenderCallback(amxNode);
        var stageId = activeInstance.GetStageId(amxNode);
        // if dimensions are different then rerender component
        var dimensions = activeInstance.GetComponentDimensions(simpleNode, amxNode);
        if (dimensions['h'] != context['oldheight'] || dimensions['w'] != context['oldwidth'])
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, activeInstance.getTypeName(), "InitComponent.postResizeCallback", "Re-rendering component due to a window resize event.");
          // call render callback to rerender component
          renderCallback.call(activeInstance, activeInstance.GetComponentInstance(simpleNode, amxNode), dimensions['w'], dimensions['h'], amxNode, stageId);
        }
      };
    }
    return this._windowPostResizeCallback;
  };

  /**
   * Function renders component.
   * @private
   */
  BaseComponentRenderer.prototype._renderComponent = function (simpleNode, amxNode)
  {
    // only in test mode allow IDs on svg elements
    try
    {
      // get fresh new dom node
      simpleNode = document.getElementById(amxNode.getId());
      if (!simpleNode)
      {
        // simpleNode is not in DOM, do not render
        return;
      }
      // obtain component instance
      var componentInstance = this.GetComponentInstance(simpleNode, amxNode);
      // process style classes and set style related options
      this.ProcessStyleClasses(simpleNode, amxNode);
      // get components dimensions
      var dimensions = this.GetComponentDimensions(simpleNode, amxNode);
      // render the component itself
      this.RenderComponent(componentInstance, dimensions['w'], dimensions['h'], amxNode);

      if (amx && amx.testmode === true)
      {
        amxNode.setAttributeResolvedValue('___test.component.rendered', true);
      }
      // component instance rendered, reset the dirty flag
      this.SetOptionsDirty(amxNode, false);
    }
    catch (ex)
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "_renderComponent", "Exception (line: " + ex.line + ")");
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "_renderComponent", "Exception: " + ex.message + " (line: " + ex.line + ")");
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "_renderComponent", "Stack: " + ex.stack);
      // remove the rendered content, if it exists, it's broken anyway
      var stageId = this.GetStageId(amxNode);
      var stage = document.getElementById(stageId);
      if (stage)
      {
        simpleNode.removeChild(stage);
      }
    }
  };

  /**
   * @return unique id of the element which is used for rendering
   */
  BaseComponentRenderer.prototype.GetStageId = function (amxNode)
  {
    var id = this.GetComponentId(amxNode);
    if (!id)
    {
      id = amxNode.getTag().getName();
    }

    id = id + '_svg';

    return id;
  };

  /**
   * @param node root node of the component
   * @param stageId unique id of element where the rendering is performed
   * @param width width of the component
   * @param height height of the component
   * @return DvtToolkitContext
   */
  BaseComponentRenderer.prototype.CreateRenderingContext = function (root, stageId)
  {
    // only in test mode allow IDs on svg elements
    if (JSONPath('amx.testmode') === true 
     && JSONPath('dvt.Displayable') != null)
    {
      dvt.Displayable.SET_ID_ON_DOM = true;
    }

    var stage = document.getElementById(stageId);
    if (stage)
    {
      root.removeChild(stage);
    }
    var context = new dvt.Context(root, root.id);

    return context;
  };

  BaseComponentRenderer.prototype._adjustStageParameters = function (stage, width, height)
  {
    if (typeof stage === 'string')
    {
      stage = document.getElementById(stage);
    }

    if (stage instanceof SVGSVGElement)
    {
      var stageDim = this.AdjustStageDimensions(
      {
        'width' : width, 'height' : height
      });
      stage.setAttribute('viewBox', "0 0 " + stageDim['width'] + " " + stageDim['height']);
      stage.setAttribute('preserveAspectRatio', "none");
    }
  };

  BaseComponentRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    return dim;
  };

  /**
   * @return callback object for the toolkit component which handles value change, selection and other types
   * of events.
   */
  BaseComponentRenderer.prototype.CreateComponentCallback = function (amxNode)
  {
    return null;
  };

  BaseComponentRenderer.prototype.CreateComponentInstance = function (simpleNode, amxNode)
  {
    var stageId = this.GetStageId(amxNode);
    var context = this.CreateRenderingContext(simpleNode, stageId);
    var callbackObj = this.CreateComponentCallback(amxNode);
    if (!callbackObj)
    {
      callbackObj = null;
    }
    var callback = (callbackObj === null) ? null : callbackObj['callback'];

    var instance = this.CreateToolkitComponentInstance(context, stageId, callbackObj, callback, amxNode);
    if (context)
    {
      context.getStage().addChild(instance);
    }
    return instance;
  };

  /**
   * @return instance for the toolkit component
   */
  BaseComponentRenderer.prototype.GetComponentInstance = function (simpleNode, amxNode)
  {
    var componentInstance = amxNode.getAttribute(COMPONENT_INSTANCE);
    if (!componentInstance && simpleNode)
    {
      componentInstance = this.CreateComponentInstance(simpleNode, amxNode);
      amxNode.setAttributeResolvedValue(COMPONENT_INSTANCE, componentInstance);
    }
    return componentInstance;
  };

  /**
   * @param context DvtToolkitContext
   * @param stageId unique id of element where the rendering is performed
   * @param callbackObj object which wraps callback function
   * @param callback function which handles value changes and other type of events
   * @amxNode amxNode of this component
   * @return initiliazed instance of the toolkit representation of thie component which will be used to render this component.
   */
  BaseComponentRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    return null;
  };

  /**
   * Function should invoke render function on the toolkit representation of the component
   *
   * @param instance component instance created in function CreateToolkitComponentInstance
   * @param width width of the component
   * @param height height of the component
   * @param amxNode amxNode of this component
   */
  BaseComponentRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {};

  /**
   * unregister all DOM node's listeners
   */
  BaseComponentRenderer.prototype.DestroyComponent = function (simpleNode, amxNode)
  {
    var resizeHandler = adf.mf.internal.dvt.util.ResizeHandler.getInstance();
    resizeHandler.removeResizeCallback(amxNode.getId());

    adf.mf.api.amx.removeBubbleEventListener(simpleNode, 'resize', this._parentResizeHandler);

    amxNode.setAttributeResolvedValue(COMPONENT_INSTANCE, null);
  };

  /**
   * sets legend style properties based on CSS
   */
  BaseComponentRenderer.prototype.ProcessStyleClasses = function (node, amxNode)
  {
    var styleClassMap = this.GetStyleClassesDefinition();

    if (styleClassMap[adf.mf.internal.dvt.ROOT_NODE_STYLE] !== undefined)
    {
      this._processStyleClass(amxNode, node, styleClassMap[adf.mf.internal.dvt.ROOT_NODE_STYLE]);
    }

    var child = node.firstElementChild;

    while (child)
    {
      var classList = child.classList;
      if (classList)
      {
        for (var i = 0, length = classList.length;i < length;i++)
        {
          var className = classList[i];
          if (className)
          {
            var classDefinition = styleClassMap[className];
            if (classDefinition)
            {
              this._processStyleClass(amxNode, child, classDefinition);
            }
          }
        }
      }
      child = child.nextElementSibling;
    }
  };

  BaseComponentRenderer.prototype.IsSkyros = function ()
  {
    var resources = adf.mf.environment.profile.cssResources;
    for (var i = 0;i < resources.length;i++)
    {
      if (resources[i].indexOf("Fusion") > 0)
        return true;
    }
    return false;
  };

  BaseComponentRenderer.prototype.IsAlta = function ()
  {
    if (this.IsSkyros())
    {
      return false;
    }

    var resources = adf.mf.environment.profile.cssResources;
    for (var i = 0;i < resources.length;i++)
    {
      if (resources[i].indexOf("mobileAlta") > 0)
      {
        if (resources[i].indexOf('-1.3') > 0 ||   
            resources[i].indexOf('-1.2') > 0 ||   
            resources[i].indexOf('-1.1') > 0 ||   
            resources[i].indexOf('-1.0') > 0)
        {
          return true;
        }    
      }
    }

    return false;
  };

  BaseComponentRenderer.prototype.IsNextSkin = function ()
  {
    return !this.IsSkyros() && !this.IsAlta();
  };

  /**
   * Determines if the component should prevent propagation of swipe/drag gestures.
   * Components that handle swipe/drag internally should not propagate events further
   * to their containers to avoid gesture conflicts. By default, all DVT components
   * propagation of swipe/drag start events. The type handler should override this method
   * when the component is mostly static and should propagate drag/swipe gestures to its
   * container.
   */
  BaseComponentRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    return true;
  };

  BaseComponentRenderer.prototype._getComputedHeight = function (amxNode)
  {
    return amxNode.getAttribute('_computedheight');
  };

  BaseComponentRenderer.prototype._getComputedWidth = function (amxNode)
  {
    return amxNode.getAttribute('_computedwidth');
  };

  BaseComponentRenderer.prototype._setComputedHeight = function (amxNode, value)
  {
    amxNode.setAttributeResolvedValue('_computedheight', value);
  };

  BaseComponentRenderer.prototype._setComputedWidth = function (amxNode, value)
  {
    amxNode.setAttributeResolvedValue('_computedwidth', value);
  };

  BaseComponentRenderer.prototype._processStyleClass = function (amxNode, node, definition)
  {
    if (definition instanceof Array)
    {
      for (var i = 0;i < definition.length;i++)
      {
        this._resolveStyle(amxNode, node, definition[i]);
      }
    }
    else 
    {
      this._resolveStyle(amxNode, node, definition);
    }
  };

  BaseComponentRenderer.prototype._resolveStyle = function (amxNode, node, definition)
  {
    var path = new JSONPath(this.GetDataObject(amxNode), definition['path']);
    var value = undefined;
    var part = null;

    if (definition['type'])
    {
      if (definition['type'] instanceof Array)
      {
        for (var i = 0;i < definition['type'].length;i++)
        {
          part = definition['type'][i](node, path.getValue());
          if (part)
          {
            if (!value)
              value = '';
            value += part;
          }
        }
      }
      else 
      {
        value = definition['type'](node, path.getValue());
      }
    }

    if (value !== undefined && (definition['overwrite'] !== false || path.getValue() === undefined) && !(definition['ignoreEmpty'] === true && (value == null || (typeof value == 'string' && value.replace(/^\s+/g, '') == ''))))
    {
      if (path.setValue(value))
      {
        this.SetOptionsDirty(amxNode, true);
      }
    }
  };

  BaseComponentRenderer.prototype._isReadyToRender = function (amxNode)
  {
    if (amxNode.getAttribute("_rbLoaded") === "loading")
    {
      return false;
    }
    if (!amxNode.getAttribute('_readyToRender'))
    {
      return false;
    }

    var ready = true;    

    amxNode.visitChildren(new adf.mf.api.amx.VisitContext(),
      function (visitContext, visitedNode)
      {
        if (visitedNode.isAttributeDefined("rendered") 
          && adf.mf.api.amx.isValueFalse(visitedNode.getAttribute('rendered')))
        {
          return adf.mf.api.amx.VisitResult['REJECT'];
        }

        if (!visitedNode.isReadyToRender())
        {
          ready = false;
          return adf.mf.api.amx.VisitResult['COMPLETE'];
        }

        return adf.mf.api.amx.VisitResult['ACCEPT'];
      });

    return ready;
  };

  BaseComponentRenderer.prototype._setReadyToRender = function (amxNode, value)
  {
    amxNode.setAttributeResolvedValue('_readyToRender', value ? true : false);
  };

  BaseComponentRenderer.prototype.isNodeReadyToRender = function (amxNode)
  {
    return ((amxNode.isReadyToRender && amxNode.isReadyToRender()) || (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["UNRENDERED"]));
  };

  BaseComponentRenderer.prototype.GetResourceBundles = function ()
  {
    return [adf.mf.internal.dvt.util.ResourceBundle.createLocalizationBundle('DvtUtilBundle')];
  };
  
  BaseComponentRenderer.prototype.IsRTL = function()
  {
    return document.documentElement.dir == "rtl";
  };

  BaseComponentRenderer.prototype._loadResourceBundles = function (amxNode)
  {
    var resourceLoader, bundles;
    if (this._loaded === true)
    {
      amxNode.setAttributeResolvedValue("_rbLoaded", "ok");
      return;
    }

    if (!adf.mf.environment.profile.dtMode && JSONPath('dvt.Bundle') != null)
    {
      if (this._loading)
      {
        this._loading.push(amxNode);
        amxNode.setAttributeResolvedValue("_rbLoaded", "loading");
        return;
      }
      else
      {
        this._loading = [amxNode];
        amxNode.setAttributeResolvedValue("_rbLoaded", "loading");
      }

      bundles = this.GetResourceBundles();

      if (bundles && bundles.length > 0)
      {
        resourceLoader = adf.mf.internal.dvt.util.ResourceBundleLoader.getInstance();
        var that = this;
        resourceLoader.loadBundles(bundles, function()
        {
          that._loaded = true;
          if (that._loading)
          {
            var args = new adf.mf.api.amx.AmxNodeUpdateArguments();

            that._loading.forEach(function(n)
            {
              n.setAttributeResolvedValue("_rbLoaded", "ok");
              args.setAffectedAttribute(n, "_rbLoaded");
            });

            delete that._loading;
            adf.mf.api.amx.markNodeForUpdate(args);
          }
        });
      }
    }
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    DataStampRenderer.js
 */
(function ()
{
  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var DataStampRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(DataStampRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.DataStampRenderer');

  /**
   * Creates chart's children AMX nodes
   */
  DataStampRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    if (!adf.mf.environment.profile.dtMode)
    {
      // verify that the value el is available and resolved
      // has to be done before basic non stamped children to avoid
      // duplicities
      var action = this.GetElValueNotReadyAction(amxNode);
      if (action !== null)
      {
        return action;
      }
    }
    // create basic amx child nodes (e.g. legend)
    action = this.CreateSimpleChildrenNodes(amxNode);
    if (action !== null)
    {
      return action;
    }
    // in case of DT stop processing here
    // value is not available in this case so skip
    // creation of the stamped children
    if (adf.mf.environment.profile.dtMode)
    {
      // design time so process only simple nodes and not stamped nodes
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);

      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
    }
    // create nodes that should be stamped
    action = this.CreateStampedChildrenNodes(amxNode);
    if (action !== null)
    {
      return action;
    }
    // ready to render without need of any data loading
    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    amxNode.setAttributeResolvedValue("_placeholder", "nomore");

    return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
  }

  DataStampRenderer.prototype._getSimpleFacets = function()
  {
    var facets = this.GetFacetNames ? this.GetFacetNames() : [null];
    var stampedFacets = this.GetStampedFacetNames();
    // find facets that are not stamped and doesn't depend on the value
    var simpleFacets = facets.slice(0);
    if (stampedFacets)
    {
      simpleFacets = this.filterArray(simpleFacets, function(name)
      {
        return stampedFacets.indexOf(name) === -1;
      });
    }

    return simpleFacets;
  }

  DataStampRenderer.prototype.CreateSimpleChildrenNodes = function (amxNode)
  {
    // use default amx method to create faceted children
    amxNode.createStampedChildren(null, this._getSimpleFacets());
    return null;
  }

  DataStampRenderer.prototype.CreateStampedChildrenNodes = function (amxNode)
  {
    if (amxNode.isAttributeDefined('value'))
    {
      var dataItems = amxNode.getAttribute('value');
      // el is resolved to null so return and render no data message
      if (!dataItems)
      {
        return null;
      }

      var iter = adf.mf.api.amx.createIterator(dataItems);
      // in case of the collection model it si possible that some of the data providers are not loaded
      // in that case fetch new data and return that the component can render with waiting placeholder
      // instead of the chart
      if (iter.getTotalCount() > iter.getAvailableCount())
      {
        this.FetchDataItems(amxNode, dataItems);

        amxNode.setAttributeResolvedValue("_placeholder", "yes");
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);

        return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
      }
      // create stamped children since collection model has all the data providers loaded
      while (iter.hasNext())
      {
        iter.next();
        amxNode.createStampedChildren(iter.getRowKey(), this.GetStampedFacetNames());
      }
      // remove placeholder if it is in place
      if ("yes" == amxNode.getAttribute("_placeholder"))
      {
        amxNode.setAttributeResolvedValue("_placeholder", "nomore");
      }
    }
    else
    {
      // value is not defined so process stamped facets without rowKey
      amxNode.createStampedChildren(null, this.GetStampedFacetNames());
    }
    return null;
  }

  DataStampRenderer.prototype.FetchDataItems = function (amxNode, dataItems, collectionChange)
  {
    if (!DataStampRenderer._fetchCache)
    {
      DataStampRenderer._fetchCache = {};
    }
    var expression = amxNode.getAttributeExpression('value');
    var skip = true;
    if (!DataStampRenderer._fetchCache[expression])
    {
      skip = false;
      DataStampRenderer._fetchCache[expression] = new adf.mf.api.amx.AmxNodeUpdateArguments();
    }

    DataStampRenderer._fetchCache[expression].setAffectedAttribute(amxNode, "value");
    if (collectionChange)
    {
      DataStampRenderer._fetchCache[expression].setCollectionChanges(amxNode.getId(), "value", collectionChange);
    }
    if (skip)
    {
      return;
    }
    // fetch children out of the current stack
    window.setTimeout(
      function(items, el, renderer)
      {
        // try to load all dataproviders at oce
        adf.mf.api.amx.bulkLoadProviders(items, 0,  - 1,
          function (req, resp)
          {

            if (renderer._fetchCache && renderer._fetchCache[el])
            {
              var args = renderer._fetchCache[el];
              renderer._fetchCache[el] = null;
              adf.mf.api.amx.markNodeForUpdate(args);
            }
          },
          function (req, resp)
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.DataStampRenderer", "FetchDataItems", "Can't fetch data!");
            adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.FINE, "FetchDataItems", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
            //adf.mf.api.amx.hideLoadingIndicator();
          });
      },
    1, dataItems, expression, DataStampRenderer);

    dataItems = null;
    amxNode = null;
    expression = null;
  }

  DataStampRenderer.prototype.GetElValueNotReadyAction = function (amxNode)
  {
    if (amxNode.isAttributeDefined('value') && amxNode.getAttribute('value') === undefined)
    {
      // Mark it so the framework knows that the children nodes cannot be
      // created until the collection model has been loaded
      amxNode.setAttributeResolvedValue("_placeholder", "yes");
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);

      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["DEFERRED"];
    }

    return null;
  }

  DataStampRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    DataStampRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);

    if (attributeChanges.hasChanged('value') || descendentChanges)
    {
      this.SetOptionsDirty(amxNode, true);
    }
  };

  DataStampRenderer.prototype.render = function (amxNode, id)
  {
    var rootElement = DataStampRenderer.superclass.render.call(this, amxNode, id);

    if ("yes" == amxNode.getAttribute("_placeholder"))
    {
      var placeholder = document.createElement("div");
      placeholder.id = id + "_placeholder";
      placeholder.className = "dvtm-component-placeholder amx-deferred-loading";
      var msgLoading = adf.mf.resource.getInfoString("AMXInfoBundle", "MSG_LOADING");
      placeholder.setAttribute("aria-label", msgLoading);
      rootElement.appendChild(placeholder);

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"]);
    }

    return rootElement;
  }

  DataStampRenderer.prototype.postDisplay = function (rootElement, amxNode)
  {
    if ("yes" == amxNode.getAttribute("_placeholder"))
    {

      if (this.IsAncestor(document.body, rootElement))
      {
        this.GetComponentDimensions(rootElement, amxNode);
      }
      return; // this function is not applicable for placeholders
    }

    if ("nomore" == amxNode.getAttribute("_placeholder"))
    {
      amxNode.setAttributeResolvedValue("_placeholder", null); // now null for real

      if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"])
      {
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["RENDERED"]);
      }
      var placeholder = document.getElementById(amxNode.getId() + "_placeholder");
      if (placeholder)
      {
        placeholder.parentNode.removeChild(placeholder);
      }
    }
    DataStampRenderer.superclass.postDisplay.call(this, rootElement, amxNode);
  }

  DataStampRenderer.prototype.refresh = function(amxNode, attributeChanges, descendentChanges)
  {
    if ("yes" == amxNode.getAttribute("_placeholder"))
      return; // this function is not applicable for placeholders

    if ("nomore" == amxNode.getAttribute("_placeholder"))
    {
      amxNode.setAttributeResolvedValue("_placeholder", null);

      if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"])
      {
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["RENDERED"]);
      }
      var placeholder = document.getElementById(amxNode.getId() + "_placeholder");
      if (placeholder)
      {
        placeholder.parentNode.removeChild(placeholder);
      }
    }
    /* BUG 17458279: Check if we have some descendent changes available. If so, then use them and drop them. */
    if ((descendentChanges === undefined) && (amxNode["_pendingDescendentChanges"] !== undefined))
    {
      descendentChanges = amxNode["_pendingDescendentChanges"];
    }
    delete amxNode["_pendingDescendentChanges"];
    // recover all the information about attribute changes before bulkLoadProvider
    if (amxNode["_pendingAttributeChanges"])
    {
      attributeChanges = amxNode["_pendingAttributeChanges"];
      delete amxNode["_pendingAttributeChanges"];
    }
    // verify that we have fully loaded collection model
    if (amxNode.getAttribute('value'))
    {
      var iter = adf.mf.api.amx.createIterator(amxNode.getAttribute('value'));
      if (iter.getTotalCount() > iter.getAvailableCount())
      {
        return;
      }
    }

    DataStampRenderer.superclass.refresh.call(this, amxNode, attributeChanges, descendentChanges);
  }

  DataStampRenderer.prototype._partialVisitChildren = function (amxNode, visitContext, callback)
  {
    // find all visitable nodes and visit only them
    var nodesToWalk = visitContext.getChildrenToWalk(amxNode);
    if (nodesToWalk.length === 0)
    {
      return false;
    }

    var varName = null;
    var iter = undefined;

    for (var i = 0; i < nodesToWalk.length; i++)
    {
      // create iterator instance only in case that the node has
      // a stamp key set on it
      var variableSet = false;
      if (iter !== null && nodesToWalk[i].getStampKey() !== null)
      {
        if (iter === undefined)
        {
          var dataItems = amxNode.getAttribute('value');
          if (dataItems)
          {
              // find data collection and variable name
            iter = adf.mf.api.amx.createIterator(amxNode.getAttribute('value'));
            varName = amxNode.getAttribute('var');
          }
          else
          {
              iter = null;
          }
        }

        if (iter)
        {
          // set context variable related to the node being visited
            iter.setCurrentRowKey(nodesToWalk[i].getStampKey());
            adf.mf.el.addVariable(varName, getCurrent(iter));

            variableSet = true;
        }
      }
      // visit the node
      if (nodesToWalk[i].visit(visitContext, callback))
      {
        if (variableSet)
        {
          adf.mf.el.removeVariable(varName);
        }
        return true;
      }
      if (variableSet)
      {
        adf.mf.el.removeVariable(varName);
      }
    }

    return false;
  }

  // XXX[Jerry] Hack that retrieves TreeNode object from
  // the iterator instead of the simple json as the current
  // implementation of the getCurrent does.
  // ------------------------------------------------------
  // issue is tracked in the bug 19561544
  var getCurrent = function(iter)
  {
    if (!iter.isTreeNodeIterator())
      return iter.getCurrent();

    var dataItems = iter._items;
    return dataItems.localFetch(dataItems.index);
  }

  DataStampRenderer.prototype._fullVisitChildren = function (amxNode, visitContext, callback)
  {
    // visit all faceted children which are independent on the value attribue
    amxNode.visitStampedChildren(null, this._getSimpleFacets(), null, visitContext, callback);

    var facets = this.GetStampedFacetNames();
    // visit all faceted children that relies on the value attribute in
    // case that this attribue is not defined - use without any rowKey
    if (!amxNode.isAttributeDefined('value'))
    {
      return amxNode.visitStampedChildren(null, facets ? facets : [null], null, visitContext, callback);
    }

    var dataItems = amxNode.getAttribute('value');
    if (dataItems)
    {
      var varName = amxNode.getAttribute('var');
      var iter = adf.mf.api.amx.createIterator(dataItems);
      // go through whole collection and visit chidren one by one
      while (iter.hasNext())
      {
        adf.mf.el.addVariable(varName, iter.next());

        if (amxNode.visitStampedChildren(iter.getRowKey(), facets ? facets : [null], null, visitContext, callback))
        {
          adf.mf.el.removeVariable(varName);
          return true;
        }
        adf.mf.el.removeVariable(varName);
      }
    }

    return false;
  }

  /**
   * Visits chart's children nodes
   */
  DataStampRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    if (visitContext.isVisitAll())
    {
      return this._fullVisitChildren(amxNode, visitContext, callback);
    }
    else
    {
      return this._partialVisitChildren(amxNode, visitContext, callback);
    }
  }

  /**
   * @param collectionChange {adf.mf.api.amx.AmxCollectionChange}
   * @return {boolean} true when collection change contains informations about individual changes
   */
  var isItemizedChange = function (collectionChange)
  {
    if (collectionChange != null && collectionChange.isItemized())
    {
      return true;
    }

    return false;
  }
  /**
   * Updates chart's children nodes
   */
  DataStampRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // nothing to do if there are no attribue changes
    if (!attributeChanges || attributeChanges.getSize() === 0)
    {
      return adf.mf.api.amx.AmxNodeChangeResult['NONE'];
    }
    // if inlineStyle has changed we need to recreate chart instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // if 'value' changed, need to rebuild the nodes hierarchy
    if (attributeChanges.hasChanged('value'))
    {
      var dataItems = amxNode.getAttribute('value');

      if (dataItems === undefined || dataItems === null)
      {
        return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
      }
      var oldValue = attributeChanges.getOldValue("value");
      var collectionChange = attributeChanges.getCollectionChange("value");

      // Do not handle the collection change if only the hasMoreKeys flag is
      // changing
      if (collectionChange != null && collectionChange.hasMoreKeysChanged() &&
        collectionChange.getCreatedKeys().length == 0 &&
        collectionChange.getUpdatedKeys().length == 0 &&
        collectionChange.getDeletedKeys().length == 0 &&
        collectionChange.getDirtiedKeys().length == 0)
      {
        return adf.mf.api.amx.AmxNodeChangeResult['NONE'];
      }

      var iter = adf.mf.api.amx.createIterator(dataItems);
      // process changes from the data change event before loading the data
      // to avoid problems with slow down data provider
      if (amxNode.getAttribute('_waitForData') !== true)
      {
        // verify that we can update the individual items
        if (oldValue && isItemizedChange(collectionChange))
        {
          this._itemizedUpdate(amxNode, collectionChange, this.GetStampedFacetNames());
        }
        else
        {
          this._nonItemizedUpdate(amxNode, this.GetStampedFacetNames(), dataItems, oldValue);
        }
      }
      // loading of rows not available in the cache
      if (iter.getTotalCount() > iter.getAvailableCount() || (amxNode.getAttribute('_waitForData') !== true && isItemizedChange(collectionChange)))
      {
        // set flag to avoid infinite call of bulk load providers
        amxNode.setAttributeResolvedValue("_waitForData", true);
        if (!amxNode["_pendingAttributeChanges"])
        {
          amxNode["_pendingAttributeChanges"] = attributeChanges;
        }
        this.FetchDataItems(amxNode, dataItems, collectionChange);
        // cannot rebuild the structure yet, wating for dataa
        return adf.mf.api.amx.AmxNodeChangeResult['NONE'];
      }
      // reset _secondCall flag
      amxNode.setAttributeResolvedValue("_waitForData", false);

      if ("yes" == amxNode.getAttribute("_placeholder"))
      {
        amxNode.setAttributeResolvedValue("_placeholder", "nomore");
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }

  /**
   * Handles update that allows to rebuild only part of the hierarchy of the stamped children.
   *
   * @param amxNode {AmxNode} component's amxNode
   * @param collectionChange {adf.mf.api.amx.AmxCollectionChange} contains information about all the changes
   * @param facets {Array<String>} facets that should be affected
   */
  DataStampRenderer.prototype._itemizedUpdate = function (amxNode, collectionChange, facets)
  {
    // TODO: Handler UpdatedKeys in more sophisticated manner.
    var deletedKeys = collectionChange.getDeletedKeys();
    // var updatedKeys = collectionChange.getUpdatedKeys();
    var dirtiedKeys = collectionChange.getDirtiedKeys();
    var createdKeys = collectionChange.getCreatedKeys();
    // determine keys that should be removed
    var keysForRemoval = deletedKeys/*.concat(updatedKeys)*/.concat(dirtiedKeys);
    // remove deleted or changed keys
    for (var i = 0, size = keysForRemoval.length; i < size; i++)
    {
      var deletedKey = keysForRemoval[i];
      var children;
      if (facets)
      {
        children = [];
        for (var k = 0; k < facets.length; k++)
        {
          var subSet = amxNode.getChildren(facets[k], deletedKey);
          children = children.concat(subSet);
        }
      }
      else
      {
        children = amxNode.getChildren(null, deletedKey);
      }
      for (j = children.length - 1; j >= 0; j--)
      {
        amxNode.removeChild(children[j]);
      }
    }
    // determine new keys and updated keys to recreate amxNode
    var modifiedKeys = /*updatedKeys.concat*/(dirtiedKeys).concat(createdKeys);
    // add new keys and new keys for changed keys
    for (var idx = 0; idx < modifiedKeys.length; idx++)
    {
      amxNode.createStampedChildren(modifiedKeys[idx], facets);
    }
  }

  /**
   * Handles update that requires to rebuild completely the hierarchy of the stamped children.
   *
   * @param amxNode {AmxNode} component's amxNode
   * @param facets {Array<String>} facets that should be affected
   */
  DataStampRenderer.prototype._nonItemizedUpdate = function (amxNode, facets, dataItems, oldValue)
  {
    var i, ii, j, length, iter, keys, children;
    facets = facets || [null];

    if (oldValue)
    {
      for (i = 0, length = facets.length; i < length; i++)
      {
        iter = adf.mf.api.amx.createIterator(oldValue);
        if (iter.isTreeNodeIterator())
        {
          keys = dataItems.treeNodeBindings.keys;
          for (ii = 0, length = keys.length; ii < length; ii++)
          {
            children = amxNode.getChildren(facets[i], keys[ii]);
            for (j = children.length - 1; j >= 0; j--)
            {
              amxNode.removeChild(children[j]);
            }
          }
        }
        else
        {
          while (iter.hasNext())
          {
            iter.next();
            children = amxNode.getChildren(facets[i], iter.getRowKey());
            for (j = children.length - 1; j >= 0; j--)
            {
              amxNode.removeChild(children[j]);
            }
          }
        }
      }
    }
    // create the new stamped children hierarchy
    if (dataItems)
    {
      iter = adf.mf.api.amx.createIterator(dataItems);
      if (iter.isTreeNodeIterator())
      {
        keys = dataItems.treeNodeBindings.keys;
        for (i = 0, length = keys.length; i < length;i++)
        {
          amxNode.createStampedChildren(keys[i], facets);
        }
      }
      else
      {
        while (iter.hasNext())
        {
          iter.next();
          amxNode.createStampedChildren(iter.getRowKey(), facets);
        }
      }
    }
  }

  DataStampRenderer.prototype.getDescendentChangeAction = function (amxNode, descendentChanges)
  {
    amxNode["_pendingDescendentChanges"] = descendentChanges;
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }

  // END OF THE AMX INTERFACE
  /**
   * function iterates through collection returned by value attribute and for each item from this collection
   * renders each child in the specified facet.
   */
  DataStampRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context, facetName)
  {
    var varName = amxNode.getAttribute('var');// need to use this since var is reserved
    var value = amxNode.getAttribute('value');

    if (facetName)
    {
      if (!amxNode.getTag().getChildFacetTag(facetName))
      {
        // expected stamped facet not present, nothing to do
        return false;
      }
    }
    else
    {
      var stampedChildTags = amxNode.getTag().getChildren(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, this.GetStampedChildTagName(facetName));
      if (!stampedChildTags || stampedChildTags.length === 0)
      {
        // expected stamped child tag not found, nothing to do
        return false;
      }
    }

    if (value === undefined)
    {
      return this.ProcessStampedChild(options, amxNode, context, facetName);
    }

    var iter = adf.mf.api.amx.createIterator(value);
    var changed = false;
    while (iter.hasNext())
    {
      adf.mf.el.addVariable(varName, iter.next());
      changed |= this.ProcessStampedChild(options, amxNode, context, facetName, iter.getRowKey());
      adf.mf.el.removeVariable(varName);
    }

    return changed;
  };

  DataStampRenderer.prototype.PopulateCategories = function ()
  {
    return false;
  };

  DataStampRenderer.prototype.ProcessStampedChild = function (options, amxNode, context, facetName, rowKey)
  {
    // get all children for the facet and rowKey
    var chartDataItemNodes = amxNode.getChildren(facetName, rowKey);
    var changed = false;
    var iter2 = adf.mf.api.amx.createIterator(chartDataItemNodes);
    // iterate through child nodes and run renderer for each of them
    while (iter2.hasNext())
    {
      var childNode = iter2.next();

      if (childNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(childNode.getAttribute('rendered')))
        continue;// skip unrendered nodes
      // if the node includes unresolved attributes, no point to proceed
      if (!childNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
      }

      var rendererName = (facetName) ? facetName : 'stamped';
      var rendererObject = this.GetChildRenderers(rendererName)[childNode.getTag().getName()];
      if (rendererObject && rendererObject['renderer'])
      {
        // setup context
        context['_rowKey'] = rowKey;
        var renderer = rendererObject['renderer'];
        if (renderer.ProcessAttributes)
        {
          var changes = context['_attributeChanges'];
          var descendentChanges = context['_descendentChanges'];
          if (descendentChanges)
          {
            context['_attributeChanges'] = descendentChanges.getChanges(childNode);
            if (!context['_attributeChanges'])
            {
              context['_attributeChanges'] = adf.mf.internal.dvt.BaseRenderer.EMPTY_CHANGES;
            }
          }
          else if (changes)
          {
            context['_attributeChanges'] = adf.mf.internal.dvt.BaseRenderer.EMPTY_CHANGES;
          }
          changed = changed | renderer.ProcessAttributes(options, childNode, context);
          context['_attributeChanges'] = changes;
        }
        else
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + childNode.getTag().getName() + "'!");
        }
        if (renderer.ProcessChildren)
        {
          changed = changed | renderer.ProcessChildren(options, childNode, context);
        }
        else
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + childNode.getTag().getName() + "'!");
        }
        // clear context
        delete context['_rowKey'];
      }
    }
    return changed;
  }

  /**
   * @return array of the facet names
   */
  DataStampRenderer.prototype.GetStampedFacetNames = function ()
  {
    return [null];
  }

  /**
   * Returns the name of the stamped child tag.
   * @abstract
   * @param {String} facetName optional facet name where the stamped child lives
   * @return {String} stamped child tag name
   */
  DataStampRenderer.prototype.GetStampedChildTagName = function (facetName)
  {
    return null;
  }

  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  DataStampRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var facets = this.GetStampedFacetNames() || [null];
    var changed = false;

    var changes = context['_attributeChanges'];
    var descendentChanges = context['_descendentChanges'];

    if (!changes || changes.hasChanged('value') || descendentChanges)// TODO: be smarter with descendentChanges
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "Processing value attribute '" + amxNode.getTag().getName() + "'!");

      for(var i = 0, length = facets.length; i < length; i++)
      {
        changed = changed | this.ProcessStampedChildren(options, amxNode, context, facets[i]);
      }
    }

    return changed | DataStampRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    Definitions.js
 */
(function(){

  var DOM_STRUCTURES = 
  {
    'areaChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C", "Group D"], 
            'series' : [
                {name : "Series 1", items : [74, 42, 70, 46]},
                {name : "Series 2", items : [50, 58, 46, 54]},
                {name : "Series 3", items : [34, 22, 30, 32]},
                {name : "Series 4", items : [18, 6, 14, 22]}
            ]
          }
      },
    'barChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
        },
    'bubbleChart' : 
      {
        'dtModeData' :
          {
            'groups' : ["Group A", "Group B", "Group C"], 
            'series' : [
                {name : "Series 1", items : [{x : 15, y : 25, z : 5},{x : 25, y : 30, z : 12},{x : 25, y : 45, z : 12}]},
                {name : "Series 2", items : [{x : 15, y : 15, z : 8},{x : 20, y : 35, z : 14},{x : 40, y : 55, z : 35}]},
                {name : "Series 3", items : [{x : 10, y : 10, z : 8},{x : 18, y : 55, z : 10},{x : 40, y : 50, z : 18}]},
                {name : "Series 4", items : [{x : 8, y : 20, z : 6},{x : 11, y : 30, z : 8},{x : 30, y : 40, z : 15}]}
              ]
          }
      },
    'comboChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },
    'funnelChart' : 
      {
        'dtModeData' : 
          {
            'groups' : [], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },            
    'horizontalBarChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },
    'lineChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C", "Group D", "Group E"], 
            'series' : [
               {name : "Series 1", items : [74, 62, 70, 76, 66]},
               {name : "Series 2", items : [50, 38, 46, 54, 42]},
               {name : "Series 3", items : [34, 22, 30, 32, 26]},
               {name : "Series 4", items : [18, 6, 14, 22, 10]},
               {name : "Series 5", items : [3, 2, 3, 3, 2]}
              ]
          }
      },
    'pieChart' : 
      {        
        'dtModeData' : 
          {
            'groups' : [""],
            'series' : [
                {id : "Series 1", name : "Series 1", items : [42]},
                {id : "Series 2", name : "Series 2", items : [55]},
                {id : "Series 3", name : "Series 3", items : [36]},
                {id : "Series 4", name : "Series 4", items : [22]},
                {id : "Series 5", name : "Series 5", items : [22]}
            ]
          }
      },
    'scatterChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C"], 
            'series' : [
                {name : "Series 1", items : [{x : 15, y : 15},{x : 25, y : 43},{x : 25, y : 25}]},
                {name : "Series 2", items : [{x : 25, y : 15},{x : 55, y : 45},{x : 57, y : 47}]},
                {name : "Series 3", items : [{x : 17, y : 36},{x : 32, y : 52},{x : 26, y : 28}]},
                {name : "Series 4", items : [{x : 38, y : 22},{x : 43, y : 43},{x : 58, y : 36}]}
            ]
          }
      },
    'sparkChart' : 
      {
        'dtModeData' : [20, 25, 15, 10, 18, 15, 20, 15, 25, 30, 20, 18, 25, 28, 30]
      },
    'stockChart' : 
      {
        'dtModeData' :
          {
            'groups' : [""],
            'series' : [
                {id : "BTC", name : "BTC", type: "candlestick", items : [
                  {
                   "id": "cdi1",
                   "close": 588.91,
                   "high": 591,
                   "low": 578.21,
                   "open": 589.6,
                   "shortDesc": "Stock Data Item",
                   "volume": 2803,
                   "x": "1407016800000"
                  },
                  {
                   "id": "cdi1",
                   "close": 598.2,
                   "high": 607.2,
                   "low": 581.77,
                   "open": 583.54,
                   "shortDesc": "Stock Data Item",
                   "volume": 11940,
                   "x": "1406844000000"
                  },
                  {
                   "id": "cdi1",
                   "close": 563.84,
                   "high": 586,
                   "low": 557.12,
                   "open": 585.93,
                   "shortDesc": "Stock Data Item",
                   "volume": 10499,
                   "x": "1406671200000"
                  },
                  {
                   "id": "cdi1",
                   "close": 586.53,
                   "high": 596,
                   "low": 570.5,
                   "open": 592.61,
                   "shortDesc": "Stock Data Item",
                   "volume": 10540,
                   "x": "1406498400000"
                  },
                  {
                   "id": "cdi1",
                   "close": 596.23,
                   "high": 603,
                   "low": 590,
                   "open": 602.93,
                   "shortDesc": "Stock Data Item",
                   "volume": 3608,
                   "x": "1406325600000"
                  },
                  {
                   "id": "cdi1",
                   "close": 601.66,
                   "high": 621.99,
                   "low": 591.12,
                   "open": 620.95,
                   "shortDesc": "Stock Data Item",
                   "volume": 10241,
                   "x": "1406152800000"
                  }
                 ]}
            ]
          }
      },
    'treeView' :
      {
        'dtModeData' :
        {
          'nodes': [
              {id: "00", value: 70, color: "#336699", label: "Massachusetts"},
              {id: "01", value: 95, color: "#CC3300", label: "New York"},
              {id: "02", value: 30, color: "#F7C808", label: "Connecticut"},
              {id: "03", value: 83, color: "#F7C808", label: "Maine"},
              {id: "04", value: 12, color: "#F7C808", label: "Vermont"}
           ]
         }
      },
    'timeline' :
      {
        'dtModeData' :
        {
          "start": 1263237200000,
          "selectionMode": "single",
          "end": 1266238000000,
          "minorAxis": {
            "scale": "days"
          }
        }
      },
    'timelineSeries' :
      {
        'dtModeData' :
        {
          'items0': [
              {"id": "ts1:1:ti1", "title": "Jan 13, 2010", "start": 1263337200000, "end": 1263737200000, "description": "Event 1"},
              {"id": "ts1:2:ti1", "title": "Jan 27, 2010", "start": 1264546800000, "description": "Event 2"},
              {"id": "ts1:3:ti1", "title": "Jan 29, 2010", "start": 1264719600000, "end": 1265019600000, "description": "Event 3"},
              {"id": "ts1:4:ti1", "title": "Feb 4, 2010", "start": 1265238000000, "description": "Event 4"}
           ],
           'items1': [
              {"id": "ts2:1:ti1", "title": "Jan 13, 2010", "start": 1263337200000, "end": 1263737200000, "description": "Event 1"},
              {"id": "ts2:2:ti1", "title": "Jan 27, 2010", "start": 1264546800000, "description": "Event 2"},
              {"id": "ts2:3:ti1", "title": "Jan 29, 2010", "start": 1264719600000, "end": 1265019600000, "description": "Event 3"},
              {"id": "ts2:4:ti1", "title": "Feb 4, 2010", "start": 1265238000000, "description": "Event 4"}
           ]
         }
      }
  }
  
  var ComponentDefinition = function(structure)
  {
    if(structure !== undefined)
    {
      this._dtModeData = structure['dtModeData'];
    }
    else
    {
      this._dtModeData = null;
    }
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ComponentDefinition, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.ComponentDefinition');
  
  var definitionCache = {};
  
  adf.mf.internal.dvt.ComponentDefinition = {};
  adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition = function(name)
  {
    if(definitionCache === undefined)
    {
      definitionCache = {};
    }
    
    if(definitionCache[name] === undefined)
    {
      var structure = DOM_STRUCTURES[name];
      definitionCache[name] = new ComponentDefinition(structure);
    }
    
    return definitionCache[name];
  }
 
  ComponentDefinition.prototype.getDTModeData = function()
  {
    return this._dtModeData;
  }

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/JSONUtils.js
 */
(function ()
{
  var JSONUtils = function ()
  {}

  adf.mf.internal.dvt.DvtmObject.createSubclass(JSONUtils, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.JSONUtils');

  JSONUtils.mergeObjects = function (source, destination)
  {
    // Clone so that content isn't modified
    destination = JSONUtils.cloneObject(destination);
    if (source == null)
    {
      return destination;
    }
    else if (destination == null)
    {
      return JSONUtils.cloneObject(source);
    }
    // in default case just copy source to the cloned destination
    JSONUtils.copy(source, destination);
    return destination;
  };

  JSONUtils.cloneObject = function (obj, keyFunc)
  {
    if (obj == null)
    {
      return null;
    }

    var ret = null, i, size;

    if (obj instanceof Array)
    {
      ret = [];

      // Loop through and copy the Array
      for (i = 0, size = obj.length;i < size;i++)
      {
        if (_isDeepClonable(obj[i]))
        {
          // deep clone objects
          ret[i] = JSONUtils.cloneObject(obj[i], keyFunc);
        }
        else 
        {
          // copy values
          ret[i] = obj[i];
        }
      }
    }
    else if (obj instanceof Date)
    {
      // convert Date to time millis
      ret = obj.getTime();
    }
    else if (obj instanceof Object)
    {
      ret = {};

      // Loop through all properties of the object
      var keys = Object.keys(obj);
      for (i = 0, size = keys.length;i < size;i++)
      {
        var key = keys[i];
        if (!keyFunc || keyFunc(key))
        {
          var value = obj[key];
          if (_isDeepClonable(value))
          {
            // deep clone objects
            ret[key] = JSONUtils.cloneObject(value, keyFunc);
          }
          else 
          {
            // copy values
            ret[key] = value;
          }
        }
      }
    }

    return ret;
  };

  JSONUtils.copy = function (a, b)
  {
    var keys = Object.keys(a);
    for (var i = 0, size = keys.length; i < size;i++)
    {
      var key = keys[i];
      var value = a[key];
      if (value && (value instanceof Array))
      {
        // Copy the array over, since we don't want arrays to be merged
        b[key] = JSONUtils.cloneObject(value);
      }
      else if (_isDeepClonable(value))
      {
        // Deep clone if object exists in b, copy otherwise
        if (b[key])
        {
          JSONUtils.copy(value, b[key]);
        }
        else 
        {
          b[key] = JSONUtils.cloneObject(value);
        }
      }
      else 
      {
        b[key] = value;
      }
    }
  };

  var _isDeepClonable = function (obj)
  {
    if (typeof obj === 'undefined')
      return false;
    else 
      return (obj instanceof Object) && !(obj instanceof Boolean) && !(obj instanceof String) && !(obj instanceof Number) && !(obj instanceof Function);
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    util/ResourceBundle.js
 */
(function()
{
  var ResourceBundle = function (path, resourceName, checkCallback, loadCallback)
  {
    this.path = path;
    this.resourceName = resourceName;
    this.checkCallback = checkCallback;
    this.loadCallback = loadCallback;
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ResourceBundle, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResourceBundle');

  ResourceBundle.L18N_BUNDLES_PATH = 'js/toolkit/resource/';

  ResourceBundle.prototype.getPath = function()
  {
    return this.path;
  };

  ResourceBundle.prototype.getResourceName = function()
  {
    return this.resourceName;
  };

  ResourceBundle.prototype.getCheckCallback = function()
  {
    return this.checkCallback;
  };

  ResourceBundle.prototype.getLoadCallback = function()
  {
    return this.loadCallback;
  };

  ResourceBundle.prototype.getUrl = function()
  {
    var url = this.getPath();
    if (!(url.indexOf("/", url.length - "/".length) !== -1))
    {
      url += "/";
    }
    url += this.getResourceName();

    return url;
  };

  ResourceBundle.createLocalizationBundle = function(resourceName, path, bundleProperty)
  {
    if (!path) path = ResourceBundle.L18N_BUNDLES_PATH;
    if (!bundleProperty) bundleProperty = resourceName + '_RB';

    var checkCallback = function() 
    {
      return typeof window[bundleProperty] != 'undefined';  
    };

    var loadCallback = function() 
    {
      dvt.Bundle.addLocalizedStrings(window[bundleProperty]);  
    };

    return new ResourceBundle(path, resourceName, checkCallback, loadCallback); 
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/AttributeGroupConfig.js
 */
(function(){
  
  /**
   *  Class representing attribute group configuration. Following configuration is supported:
   *  1. updateCategoriesCallback
   *        Callback used to update categories on an data item. It is then up to the callback to set categories properly on the data item.
   *  2. typeToItemAttributeMapping
   *        Particular attribute group type can be mapped to particular attribute of an data item. Resolved value is assigned to
   *        given attribute on the data item.    
   *  3. typeToLegendAttributeMapping
   *        Particular attribute group type can be mapped to particular attribute of an legend item. Resolved value is assigned to
   *        given attribute on the legend item.
   *  4. typeToDefaultPaletteMapping
   *        Particular attribute group type can be mapped to a default palette. When no value is resolved
   *        for given type then value from given default palette is taken.
   */ 
  var AttributeGroupConfig = function()
  {
    this['updateCategoriesCallback'] = null;
    this['typeToItemAttributeMapping'] = {};
    this['typeToDefaultPaletteMapping'] = {};
    this['updateValuesCallback'] = {};
    this['typeToLegendAttributeMapping'] = {};
    this['legendTypeCallback'] = null;
    this['applyDefaultPaletteOverrides'] = false;
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroupConfig, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig');
  
  /**
   *  Sets callback used for categories update.
   *  @param callback categories update callback     
   */   
  AttributeGroupConfig.prototype.setUpdateCategoriesCallback = function(callback) {
    this['updateCategoriesCallback'] = callback;
  };
  
  /**
   *  Returns callback used for categories update or null if no callback is defined.
   *  @return callback used for categories update or null if no callback is defined     
   */
  AttributeGroupConfig.prototype.getUpdateCategoriesCallback = function() {
    return this['updateCategoriesCallback'];
  };
  
  /**
   *  Adds type to item attribute mapping.
   *  @param type type
   *  @param attribute attribute           
   */  
  AttributeGroupConfig.prototype.addTypeToItemAttributeMapping = function(type, attribute) {
    this['typeToItemAttributeMapping'][type] = attribute;
  };
  
  /**
   *  Returns item attribute for given type or undefined if no item attribute is defined for given type.
   *  @param type type
   *  @return item attribute for given type or undefined if no item attribute is defined for given type        
   */  
  AttributeGroupConfig.prototype.getTypeToItemAttributeMapping = function(type) {
    return this['typeToItemAttributeMapping'][type];
  };
  
  /**
   *  Adds type to default palette mapping.
   *  @param type type
   *  @param defaultPalette default palette           
   */  
  AttributeGroupConfig.prototype.addTypeToDefaultPaletteMapping = function(type, defaultPalette) {
    this['typeToDefaultPaletteMapping'][type] = defaultPalette;
  };
  
  /**
   *  Returns default palette mapping for given type or undefined if no default palette is defined for given type.
   *  @param type type
   *  @param default palette mapping for given type or undefined if no default palette is defined for given type.           
   */
  AttributeGroupConfig.prototype.getTypeToDefaultPaletteMapping = function(type) {
    return this['typeToDefaultPaletteMapping'][type];
  };
  
  /**
   *  Adds callback used to update value for given type.
   *  @param type type
   *  @param callback value update callback           
   */  
  AttributeGroupConfig.prototype.addUpdateValueCallback = function(type, callback) {
    this['updateValuesCallback'][type] = callback;
  };
  
  /**
   *  Returns callback used for value update or null if no callback is defined.
   *  @param type type
   *  @return callback used for value update or null if no callback is defined.           
   */
  AttributeGroupConfig.prototype.getUpdateValueCallback = function(type) {
    return this['updateValuesCallback'][type];
  };
  
  /**
   *  Adds type to legend attribute mapping.
   *  @param type type
   *  @param attribute attribute           
   */  
  AttributeGroupConfig.prototype.addTypeToLegendAttributeMapping = function(type, attribute) {
    this['typeToLegendAttributeMapping'][type] = attribute;
  };
  
  /**
   *  Returns legend attribute for given type or undefined if no legend attribute is defined for given type.
   *  @param type type
   *  @return legend attribute for given type or undefined if no legend attribute is defined for given type        
   */  
  AttributeGroupConfig.prototype.getTypeToLegendAttributeMapping = function(type) {
    return this['typeToLegendAttributeMapping'][type];
  };
  
  /**
   *  Sets legend type callback. The callback can be a function with signature
   *  function(type, legendAttributeName, attributeGroup).
   *  @param callback callback           
   */  
  AttributeGroupConfig.prototype.setLegendTypeCallback = function(callback) {
    this['legendTypeCallback'] = callback;
  };
  
  /**
   *  Returns legend type callback
   *  @return legend type callback        
   */  
  AttributeGroupConfig.prototype.getLegendTypeCallback = function() {
    return this['legendTypeCallback'];
  };
  
  /**
   *  Sets if default palettes should be overriden
   *  @param apply if default palettes should be overriden
   */
  AttributeGroupConfig.prototype.setOverrideDefaultPalettes = function(apply) {
    this['applyDefaultPaletteOverrides'] = apply;  
  };
  
  /**
   *  Returns true if default palettes should be overriden otherwise false
   *  @return true if default palettes should be overriden otherwise false
   */
  AttributeGroupConfig.prototype.isOverrideDefaultPalettes = function() {
    return this['applyDefaultPaletteOverrides'];
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/AttributeValuesResolver.js
 */
(function(){
  
  /**
   *  Sets/updates attribute values.
   *  @param amxNode amx node
   *  @param attributeGroup attribute group                
   */  
  var AttributeValuesResolver = function(amxNode, attributeGroup)
  {
    this['types'] = attributeGroup['types'];;
    this['categories'] = attributeGroup['categories']; 
    this['attributes'] = attributeGroup['attributes']; 
    this['rules'] = attributeGroup['rules'];
    this['config'] = attributeGroup['config'];
    this['discriminant'] = attributeGroup['discriminant']
    this['attributeGroup'] = attributeGroup;
    
    this['defaultPalettes'] = {};
    
    this._updateDefaultPalettes(amxNode);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeValuesResolver, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeValuesResolver'); 
  
  AttributeValuesResolver.TYPE_ATTR = "type";
  AttributeValuesResolver.STYLE_DEFAULTS_PALETTE_ATTR = "styleDefaultsPalette";
  AttributeValuesResolver.PALETTE_ATTR = "palette";
  AttributeValuesResolver.INDEX_ATTR = "categoryIndex";
  AttributeValuesResolver.VALUE_ATTR = "value";
  
  /**
   *  Inits default palettes overrides that are then used in resolveDefaultValue function. 
   *  @param amxNode amx node
   */  
  AttributeValuesResolver.prototype._updateDefaultPalettes = function(amxNode) {
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
    var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
     
    var value, match, type, attr, matchRuleGroup, categoryIndex, styleDefaultsPalette, palette, defaultsPaletteName;
    var types = this['types'];
    var attrs = null;
    var rules = this['rules'];
    var defaultPaletteChanged;
    var sharedPalette;
    
    // RULE - last override wins
    // process attributes
    for(var i=0; i < types.length; i++) {
      type = types[i];
      defaultsPaletteName = this._getDefaultsPaletteName(type);
      styleDefaultsPalette = DefaultPalettesValueResolver.getStyleDefaultsPalette(defaultsPaletteName);
      palette = DefaultPalettesValueResolver.getDefaultsPalette(defaultsPaletteName);
      
      defaultPaletteChanged = false;
      
      if(this['discriminant']) {
        sharedPalette = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'palette.'+type);
        if(sharedPalette) {
          // shared palette already exists for given type -> reuse it
          this['defaultPalettes'][type] = sharedPalette.slice();
          defaultPaletteChanged = true;
        } else {
          this['defaultPalettes'][type] = amxNode[palette] ? amxNode[palette].slice() : [];
        }
      } else {
        this['defaultPalettes'][type] = amxNode[palette] ? amxNode[palette].slice() : [];
      }
      
      // process attributes
      attrs = this['attributes'].iterator();
      while(attrs.hasNext()) {
        attr = attrs.next();
        match = new RegExp('^('+type+')(\\d+)$').exec(attr['name']);
        if(match && match.length == 3) { 
          value = attr['value'];
          categoryIndex = match[2]-1;
          this['defaultPalettes'][type][categoryIndex] = value;
          defaultPaletteChanged = true;
        }
      }
      
      // process match rules - match rules wins over attributes therefore are processed after attributes
      matchRuleInfos = rules.resolveMatchRuleGroupsAndValue(type);
      for(var k = 0; k < matchRuleInfos.length; k++) {
        matchRuleGroup = matchRuleInfos[k]['group'];
        value = matchRuleInfos[k]['value'];
        categoryIndex = this['categories'].getIndexByValue(matchRuleGroup);
        this['defaultPalettes'][type][categoryIndex] = value;
        defaultPaletteChanged = true;
      }
      
      if(this['discriminant'] && !sharedPalette) {
        // newly built palette must be shared
        // to cover corner cases the isSharedAttributesUpdateAllowed is ignored, i.e. when palette is not shared for given type then share it
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'palette.'+type, this['defaultPalettes'][type]);
      }
      
      if(this['config'] && this['config'].isOverrideDefaultPalettes() && defaultPaletteChanged) {
        // charts build legend based on style default palettes -> update them for given type
        this._updateStyleDefaultPalette(amxNode, type, styleDefaultsPalette);
      }
    };   
  };
  
  AttributeValuesResolver.prototype._updateStyleDefaultPalette = function(amxNode, type, styleDefaultsPalette) {
    var options = amxNode.getAttribute(adf.mf.internal.dvt.BaseRenderer.DATA_OBJECT);
    var styleDefaults = options['styleDefaults'];
    if(!styleDefaults) {
      styleDefaults = {};
      options['styleDefaults'] = styleDefaults;
    }
    styleDefaults[styleDefaultsPalette] = this['defaultPalettes'][type].slice();
    
    var chartPaletteIndx = 0;
    var resolver = this;
    if(this['discriminant']) {
      this['categories'].each(function(index, category){
        var value = {};
        resolver.resolveLegendValues(value, index);
        styleDefaults[styleDefaultsPalette][chartPaletteIndx] = value[type];
        chartPaletteIndx++;
      });
    }
  };
  
  /**
   *  Returns defaults palette name for given type.
   *  @param type type
   *  @return default palette name         
   */  
  AttributeValuesResolver.prototype._getDefaultsPaletteName = function(type) {
    if(this['config'] && this['config'].getTypeToDefaultPaletteMapping(type)) {
      return this['config'].getTypeToDefaultPaletteMapping(type);
    }
    return type;
  }
  
  /**
   *  Returns legend attribute name for given type
   *  @param type type
   *  @return legend attribute name for given type 
   */  
  AttributeValuesResolver.prototype._getLegendAttributeName = function(type) {
    if(this['config'] && this['config'].getTypeToLegendAttributeMapping(type)) {
      return this['config'].getTypeToLegendAttributeMapping(type);
    }
    return this._getDefaultsPaletteName(type);
  }
  
  /**
   *  Resolves value for given type, exception rules and category index.
   *  @param type type
   *  @param exceptionRules exception rules
   *  @param categoryIndex category index
   *  @return resolved value or null value is not defined for given type                  
   */  
  AttributeValuesResolver.prototype.resolveValue = function(type, exceptionRules, categoryIndex)
  {
    // 1. return exception rule value if it exists
    // 2. return default value:
    //    1. match rule value if override exists
    //    2. attribute value if override exists
    //    3. default palette value if it exists
    var value = null;
    if (this['types'].indexOf(type) >= 0)
    {
      if(exceptionRules) {
        value = exceptionRules.resolveValue(type);
      }
      
      if(value == null) {
        value = this.resolveDefaultValue(type, categoryIndex);
      }
    }

    return value;
  };
  
  /**
   *  Resolves default value for given type and category index.
   *  @param type type
   *  @param categoryIndex category index
   *  @return default value or null value is not defined for given type                  
   */  
  AttributeValuesResolver.prototype.resolveDefaultValue = function(type, categoryIndex) {
    var value = null;
    
    var defaults = this['defaultPalettes'][type];          
    if(defaults != undefined && categoryIndex >= 0 && defaults.length > 0) 
    {            
      value = defaults[categoryIndex % defaults.length];
    }
    
    return value;
  };
  
  /**
   *  Resolves and sets values for given legendItem and category index.
   *  @param legendItem legend item
   *  @param categoryIndex category index                  
   */
  AttributeValuesResolver.prototype.resolveLegendValues = function(legendItem, categoryIndex)
  {
    var types = this['types'];
    var type = null;
    var legendAttributeName = null;
    for(var i=0; i < types.length; i++) {
      type = types[i];
      legendAttributeName = this._getLegendAttributeName(type);
      // match rules, attributes and default palettes are taken into consideration
      legendItem[legendAttributeName] = this.resolveValue(type, null, categoryIndex);
    }
  };
  
  /**
   *  Returns legend type.
   *  @return legend type                 
   */
  AttributeValuesResolver.prototype.getLegendType = function()
  {
    var types = this['types'];
    var type = null;
    var legendType = null;
    for(var i=0; i < types.length; i++) {
      type = types[i];
      type = this._getLegendTypeName(type);
      legendType = legendType ? (legendType + ' ' + type) : type;
    }
    return legendType;
  };
  
  /**
   *  Returns legend type name for given type
   *  @param type type
   *  @return legend type name for given type 
   */  
  AttributeValuesResolver.prototype._getLegendTypeName = function(type) {
    var legendAttributeName = this._getLegendAttributeName(type);
    if(this['config'] && this['config'].getLegendTypeCallback()) {
      var callback = this['config'].getLegendTypeCallback();
      return callback(type, legendAttributeName, this['attributeGroup']);
    }
    return legendAttributeName;
  };
    
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/Categories.js
 */
(function(){
  
  /**
   *  Categories representation.  
   */  
  var Categories = function(discriminant)
  {
    this['categories'] = [];
    this['categoryToIndexMap'] = {};
    this['discriminant'] = discriminant;
    this['observers'] = [];
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Categories, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Categories');
  
  /**
   *  Returns category by index.
   *  @param index index
   *  @return category by index or null if no category is defined for given index        
   */  
  Categories.prototype.getByIndex = function(index) {
    if(index >= 0 && index < this['categories'].length) {
      return this['categories'][index];
    }
    return null;
  };
  
  /**
   *  Returns category label by index.
   *  @param index index
   *  @return category label by index or null if no category is defined for given index     
   */  
  Categories.prototype.getLabelByIndex = function(index) {
    var category = this.getByIndex(index);
    if(category) {
      return category['label'];
    }
    return null;
  };
  
  /**
   *  Returns category value by index.
   *  @param index index
   *  @return category value by index or null if no category is defined for given index     
   */
  Categories.prototype.getValueByIndex = function(index) {
    var category = this.getByIndex(index);
    if(category) {
      return category['value'];
    }
    return null;
  };
  
  /**
   *  Returns category by value.
   *  @param value value
   *  @return category by value or null if no category is defined for given value     
   */
  Categories.prototype.getByValue = function(value) {
    var index = this.getIndexByValue(value);
    return getByIndex(index);
  };
  
  /**
   *  Returns category index for given category value.
   *  @param value value
   *  @return category index for given category value or -1 if no index is defined for given value     
   */
  Categories.prototype.getIndexByValue = function(value) {
    if(value && this['categoryToIndexMap'][value] >= 0){
      return this['categoryToIndexMap'][value];
    }
    return -1;
  };
  
  /**
   *  Returns category label for given category value.
   *  @param value value
   *  @return category label for given category value or -1 if no category is defined for given value     
   */
  Categories.prototype.getLabelByValue = function(value) {
    var category = this.getByValue(value);
    if(category) {
      return category['label'];
    }
    return null;
  };
  
  /**
   *  Returns true if this categories object contains category with given value and label, otherwise returns false.
   *  @param value value
   *  @param label label   
   *  @return true if this categories object contains category with given value and label, otherwise returns false     
   */
  Categories.prototype.contains = function(value, label) {
    var index = getIndex(value, label);
    if(index != -1) return true;
    return false;
  };
  
  Categories.prototype.observe = function(callback) {
    this.unobserve(callback);
    this['observers'].push(callback);
  };

  Categories.prototype.unobserve = function(callback) {
    var observers = [];
    this['observers'].forEach(function(item)
    {
      if (item !== callback)
      {
        observers.push(item);
      }
    });

    this['observers'] = observers;
  };

  /**
   *  Returns index of category with given value and label or -1 if no such category exists.
   *  @param value value
   *  @param label label   
   *  @return index of category with given value and label or -1 if no such category exists     
   */
  Categories.prototype.getIndex = function(value, label) {
    var index = this.getIndexByValue(value);
    if(index != -1 && this.getLabelByIndex(index) === label) {
      return index;
    }
    return -1;
  };
  
  /**
   *  Iterates over categories array.
   *  @param callback callback that is called for each defined item in the array     
   */  
  Categories.prototype.each = function(callback) {
    var categories = this['categories'];
    for(var i = 0; i < categories.length; i++) {
      if(categories[i]) {
        callback(i, categories[i]);
      }
    }
  };

  /**
   *  Adds new category to array of categories and returns index of given category.
   *  @param category category value
   *  @param label category label
   *  @return index of category represented by given params          
   */  
  Categories.prototype.addCategory = function (category, label) {
    var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
    var sharedCategory, index, catLabel, value;
    var discriminant = this['discriminant'];

    if(discriminant) 
    {
      index = AttributeGroupManager.addSharedCategory(discriminant, category, label);
      sharedCategory = AttributeGroupManager.getSharedCategories(discriminant).getByIndex(index);
      value = sharedCategory['value'];
      catLabel = label ? label : sharedCategory['label'];
      this['categories'][index] = this._createCategory(value, catLabel);
      this['categoryToIndexMap'][category] = index;
    }
    else
    {
      index = this.getIndexByValue(category);
      if(index == -1) {
        if(!category) category = "__"+this['categories'].length;
        
        catLabel = label ? label : category;  
        this['categories'].push(this._createCategory(category, catLabel));
        index = this['categories'].length - 1;
        this['categoryToIndexMap'][category] = index;
      }
    }
    var that = this;
    this['observers'].forEach(function(observer)
    {
      observer(that);
    });
    
    return index;
  };

  Categories.prototype._createCategory = function(value, label) {
    return {
      "value" : value,
      "label" : label
    };
  };
    
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/ColorConverter.js
 */
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.common.attributeGroup');
  
  /**
   *  Converter used to convert RGBA, RGB, 6HEX, 3HEX, keyword colors to following representation:
   *  [R, G, B, A] where, R - red channel value, G - green channel value, B - blue channel value, A - opacity value        
   */  
  var ColorConverter = function() {
    this.converters = [];
    
    // extended colors converter
    this.converters.push(this._createExtColorConverter(regexp, handler));
    
    // RGBA converter
    var regexp = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/;
    var handler = function(matches) {
      return [+matches[1], +matches[2], +matches[3], +matches[4]];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // RGB converter
    regexp = /^rgb\(([\d]+),([\d]+),([\d]+)\)/;
    handler = function(matches) {
      return [+matches[1], +matches[2], +matches[3], 1];
    }
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // 6HEX converter
    regexp = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/;
    handler = function(matches) {
      return [parseInt(matches[1], 16), parseInt(matches[2], 16), parseInt(matches[3], 16), 1];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // 3HEX converter
    regexp = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/;
    handler = function(matches) {
      return [parseInt(matches[1], 16) * 17, parseInt(matches[2], 16) * 17, parseInt(matches[3], 16) * 17, 1];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
  };
  
  /**
   *  Creates and returns regular expression based color converter.
   *  @param regexp regular expression
   *  @param matchesHandler handler to be called for given regexp exec result
   *  @return converter         
   */     
  ColorConverter.prototype._createRegexpConverter = function(regexp, matchesHandler) {
    var converter = {};
    converter.convert = function(colorStr) {
      var ret = regexp.exec(colorStr);
      if(ret) {
        ret = matchesHandler(ret);
        if(!(Object.prototype.toString.call(ret) === '[object Array]' && ret.length == 4)) {
          ret = null;
        }
      } 
      return ret;
    }
    return converter;
  };
  
  /**
   *  Creates and returns extended color keywords converter.  
   */  
  ColorConverter.prototype._createExtColorConverter = function() {
    // extended color keywords coverage - http://www.w3.org/TR/css3-color/
    extColorMap = {};
    extColorMap['black'] = [0,0,0,1];
    extColorMap['silver'] = [192,192,192,1];
    extColorMap['gray'] = [128,128,128,1];
    extColorMap['white'] = [255,255,255,1];
    extColorMap['maroon'] = [128,0,0,1];
    extColorMap['red'] = [255,0,0,1];
    extColorMap['purple'] = [128,0,128,1];
    extColorMap['fuchsia'] = [255,0,255,1];
    extColorMap['green'] = [0,255,0,1];
    extColorMap['lime'] = [191,255,0,1];
    extColorMap['olive'] = [128,128,0,1];
    extColorMap['yellow'] = [255,255,0,1];
    extColorMap['navy'] = [0,0,128,1];
    extColorMap['blue'] = [0,0,255,1];
    extColorMap['teal'] = [0,128,128,1];
    extColorMap['aqua'] = [0,255,255,1];
    extColorMap['aliceblue'] = [240,248,255,1];
    extColorMap['antiquewhite'] = [250,235,215,1];
    extColorMap['aqua'] = [0,255,255,1];
    extColorMap['aquamarine'] = [127,255,212,1];
    extColorMap['azure'] = [240,255,255,1];
    extColorMap['beige'] = [245,245,220,1];
    extColorMap['bisque'] = [255,228,196,1];
    extColorMap['black'] = [0,0,0,1];
    extColorMap['blanchedalmond'] = [255,235,205,1];
    extColorMap['blue'] = [0,0,255,1];
    extColorMap['blueviolet'] = [138,43,226,1];
    extColorMap['brown'] = [165,42,42,1];
    extColorMap['burlywood'] = [222,184,135,1];
    extColorMap['cadetblue'] = [95,158,160,1];
    extColorMap['chartreuse'] = [127,255,0,1];
    extColorMap['chocolate'] = [210,105,30,1];
    extColorMap['coral'] = [255,127,80,1];
    extColorMap['cornflowerblue'] = [100,149,237,1];
    extColorMap['cornsilk'] = [255,248,220,1];
    extColorMap['crimson'] = [220,20,60,1];
    extColorMap['cyan'] = [0,255,255,1];
    extColorMap['darkblue'] = [0,0,139,1];
    extColorMap['darkcyan'] = [0,139,139,1];
    extColorMap['darkgoldenrod'] = [184,134,11,1];
    extColorMap['darkgray'] = [169,169,169,1];
    extColorMap['darkgreen'] = [0,100,0,1];
    extColorMap['darkgrey'] = [169,169,169,1];
    extColorMap['darkkhaki'] = [189,183,107,1];
    extColorMap['darkmagenta'] = [139,0,139,1];
    extColorMap['darkolivegreen'] = [85,107,47,1];
    extColorMap['darkorange'] = [255,140,0,1];
    extColorMap['darkorchid'] = [153,50,204,1];
    extColorMap['darkred'] = [139,0,0,1];
    extColorMap['darksalmon'] = [233,150,122,1];
    extColorMap['darkseagreen'] = [143,188,143,1];
    extColorMap['darkslateblue'] = [72,61,139,1];
    extColorMap['darkslategray'] = [47,79,79,1];
    extColorMap['darkslategrey'] = [47,79,79,1];
    extColorMap['darkturquoise'] = [0,206,209,1];
    extColorMap['darkviolet'] = [148,0,211,1];
    extColorMap['deeppink'] = [255,20,147,1];
    extColorMap['deepskyblue'] = [0,191,255,1];
    extColorMap['dimgray'] = [105,105,105,1];
    extColorMap['dimgrey'] = [105,105,105,1];
    extColorMap['dodgerblue'] = [30,144,255,1];
    extColorMap['firebrick'] = [178,34,34,1];
    extColorMap['floralwhite'] = [255,250,240,1];
    extColorMap['forestgreen'] = [34,139,34,1];
    extColorMap['fuchsia'] = [255,0,255,1];
    extColorMap['gainsboro'] = [220,220,220,1];
    extColorMap['ghostwhite'] = [248,248,255,1];
    extColorMap['gold'] = [255,215,0,1];
    extColorMap['goldenrod'] = [218,165,32,1];
    extColorMap['gray'] = [128,128,128,1];
    extColorMap['green'] = [0,128,0,1];
    extColorMap['greenyellow'] = [173,255,47,1];
    extColorMap['grey'] = [128,128,128,1];
    extColorMap['honeydew'] = [240,255,240,1];
    extColorMap['hotpink'] = [255,105,180,1];
    extColorMap['indianred'] = [205,92,92,1];
    extColorMap['indigo'] = [75,0,130,1];
    extColorMap['ivory'] = [255,255,240,1];
    extColorMap['khaki'] = [240,230,140,1];
    extColorMap['lavender'] = [230,230,250,1];
    extColorMap['lavenderblush'] = [255,240,245,1];
    extColorMap['lawngreen'] = [124,252,0,1];
    extColorMap['lemonchiffon'] = [255,250,205,1];
    extColorMap['lightblue'] = [173,216,230,1];
    extColorMap['lightcoral'] = [240,128,128,1];
    extColorMap['lightcyan'] = [224,255,255,1];
    extColorMap['lightgoldenrodyellow'] = [250,250,210,1];
    extColorMap['lightgray'] = [211,211,211,1];
    extColorMap['lightgreen'] = [144,238,144,1];
    extColorMap['lightgrey'] = [211,211,211,1];
    extColorMap['lightpink'] = [255,182,193,1];
    extColorMap['lightsalmon'] = [255,160,122,1];
    extColorMap['lightseagreen'] = [32,178,170,1];
    extColorMap['lightskyblue'] = [135,206,250,1];
    extColorMap['lightslategray'] = [119,136,153,1];
    extColorMap['lightslategrey'] = [119,136,153,1];
    extColorMap['lightsteelblue'] = [176,196,222,1];
    extColorMap['lightyellow'] = [255,255,224,1];
    extColorMap['lime'] = [0,255,0,1];
    extColorMap['limegreen'] = [50,205,50,1];
    extColorMap['linen'] = [250,240,230,1];
    extColorMap['magenta'] = [255,0,255,1];
    extColorMap['maroon'] = [128,0,0,1];
    extColorMap['mediumaquamarine'] = [102,205,170,1];
    extColorMap['mediumblue'] = [0,0,205,1];
    extColorMap['mediumorchid'] = [186,85,211,1];
    extColorMap['mediumpurple'] = [147,112,219,1];
    extColorMap['mediumseagreen'] = [60,179,113,1];
    extColorMap['mediumslateblue'] = [123,104,238,1];
    extColorMap['mediumspringgreen'] = [0,250,154,1];
    extColorMap['mediumturquoise'] = [72,209,204,1];
    extColorMap['mediumvioletred'] = [199,21,133,1];
    extColorMap['midnightblue'] = [25,25,112,1];
    extColorMap['mintcream'] = [245,255,250,1];
    extColorMap['mistyrose'] = [255,228,225,1];
    extColorMap['moccasin'] = [255,228,181,1];
    extColorMap['navajowhite'] = [255,222,173,1];
    extColorMap['navy'] = [0,0,128,1];
    extColorMap['oldlace'] = [253,245,230,1];
    extColorMap['olive'] = [128,128,0,1];
    extColorMap['olivedrab'] = [107,142,35,1];
    extColorMap['orange'] = [255,165,0,1];
    extColorMap['orangered'] = [255,69,0,1];
    extColorMap['orchid'] = [218,112,214,1];
    extColorMap['palegoldenrod'] = [238,232,170,1];
    extColorMap['palegreen'] = [152,251,152,1];
    extColorMap['paleturquoise'] = [175,238,238,1];
    extColorMap['palevioletred'] = [219,112,147,1];
    extColorMap['papayawhip'] = [255,239,213,1];
    extColorMap['peachpuff'] = [255,218,185,1];
    extColorMap['peru'] = [205,133,63,1];
    extColorMap['pink'] = [255,192,203,1];
    extColorMap['plum'] = [221,160,221,1];
    extColorMap['powderblue'] = [176,224,230,1];
    extColorMap['purple'] = [128,0,128,1];
    extColorMap['red'] = [255,0,0,1];
    extColorMap['rosybrown'] = [188,143,143,1];
    extColorMap['royalblue'] = [65,105,225,1];
    extColorMap['saddlebrown'] = [139,69,19,1];
    extColorMap['salmon'] = [250,128,114,1];
    extColorMap['sandybrown'] = [244,164,96,1];
    extColorMap['seagreen'] = [46,139,87,1];
    extColorMap['seashell'] = [255,245,238,1];
    extColorMap['sienna'] = [160,82,45,1];
    extColorMap['silver'] = [192,192,192,1];
    extColorMap['skyblue'] = [135,206,235,1];
    extColorMap['slateblue'] = [106,90,205,1];
    extColorMap['slategray'] = [112,128,144,1];
    extColorMap['slategrey'] = [112,128,144,1];
    extColorMap['snow'] = [255,250,250,1];
    extColorMap['springgreen'] = [0,255,127,1];
    extColorMap['steelblue'] = [70,130,180,1];
    extColorMap['tan'] = [210,180,140,1];
    extColorMap['teal'] = [0,128,128,1];
    extColorMap['thistle'] = [216,191,216,1];
    extColorMap['tomato'] = [255,99,71,1];
    extColorMap['turquoise'] = [64,224,208,1];
    extColorMap['violet'] = [238,130,238,1];
    extColorMap['wheat'] = [245,222,179,1];
    extColorMap['white'] = [255,255,255,1];
    extColorMap['whitesmoke'] = [245,245,245,1];
    extColorMap['yellow'] = [255,255,0,1];
    extColorMap['yellowgreen'] = [154,205,50,1];
    
    var converter = {};
    converter.convert = function(colorStr) {
      var color = extColorMap[colorStr];
      return color;
    };
    
    return converter; 
  }
  
  /**
   *  Converts given array of colors to array of [R, G, B, A] representations.
   *  @param array of supported colors
   *  @return array of [R, G, B, A] representations        
   */  
  ColorConverter.prototype.convertArrayToRGBA = function(colors) {
    if(!colors || colors.length == 0) return colors;
    
    var ret = [];
    for(var i=0; i<colors.length; i++) {
      ret.push(this.convertToRGBA(colors[i]));
    }
    return ret;
  };
  
  /**
   *  Converts given color to its [R, G, B, A] representation.
   *  @param colorStr supported color string
   *  @return [R, G, B, A] representation for given color        
   */  
  ColorConverter.prototype.convertToRGBA = function(colorStr) {
    colorStr = colorStr.replace(/\s/g, '');
    var ret = null;
    for(var i=0; i<this.converters.length; i++) {
      ret = this.converters[i].convert(colorStr);
      if(ret) {
        return ret;
      }
    }
    return null;
  };
  
  adf.mf.internal.dvt.common.attributeGroup.ColorConverter = new ColorConverter();
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/ContinuousAttributeGroup.js
 */
(function(){
  
  /**
   * Continuous attribute group implementation.  
   */  
  var ContinuousAttributeGroup = function()
  {
    adf.mf.internal.dvt.common.attributeGroup.AttributeGroup.apply(this);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ContinuousAttributeGroup, 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup', 'adf.mf.internal.dvt.common.attributeGroup.ContinuousAttributeGroup');
  
  /**
   *  See parent for comment.  
   */  
  ContinuousAttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    ContinuousAttributeGroup.superclass.Init.call(this, amxNode, attrGroupsNode);
    this['attributeType'] = 'continuous';
    
    var attr = attrGroupsNode.getAttribute('maxLabel');
    if(attr) this['maxLabel'] = attr;
    attr = attrGroupsNode.getAttribute('maxValue');
    if(attr) this['maxValue'] = attr;
    attr = attrGroupsNode.getAttribute('minLabel');
    if(attr) this['minLabel'] = attr;
    attr = attrGroupsNode.getAttribute('minValue');
    if(attr) this['minValue'] = attr; 
    if(this['minValue']) this['minValue'] = +this['minValue'];
    if(this['maxValue']) this['maxValue'] = +this['maxValue'];
    this['updateMinValue'] = this['minValue'] ? false : true; 
    this['updateMaxValue'] = this['maxValue'] ? false : true; 
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.SetType = function (attrGroupsNode) {
    var color = 'color';
    this['type'] = color;
    this['types'] = [color];
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.configure = function (amxNode, attributeGroupConfig) {
    var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
    var sharedMin, sharedMax;
    
    ContinuousAttributeGroup.superclass.configure.call(this, amxNode, attributeGroupConfig);
    
    if(this['discriminant']) {
      // initialize shared min, max values and save them when needed
      if(this.isSharedAttributesUpdateAllowed()) {
        if(!this['minLabel']) this['minLabel'] = this['minValue'];
        if(!this['maxLabel']) this['maxLabel'] = this['maxValue'];
        // share min, max values
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'minValue', this['minValue']);
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'maxValue', this['maxValue']);
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'minLabel', this['minLabel']);
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'maxLabel', this['maxLabel']);
      } else { 
        // use shared min, max values and min, max labels if they weren't set explicitly
        if(this['updateMinValue']) this['minValue'] = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'minValue');
        if(this['updateMaxValue']) this['maxValue'] = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'maxValue');
        if(!this['minLabel']) this['minLabel'] = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'minLabel');
        if(!this['maxLabel']) this['maxLabel'] = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'maxLabel');
      }
    } else {
      if(!this['minLabel']) this['minLabel'] = this['minValue'];
      if(!this['maxLabel']) this['maxLabel'] = this['maxValue'];
    }
    
    var colors = this._getRangeColors(amxNode);
    this._initColorMappings(colors);
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.processItem = function (attrGroupsNode) {
    var processedInfo = ContinuousAttributeGroup.superclass.processItem.call(this, attrGroupsNode);
    
    var value = +processedInfo['value'];
    this._updateMinMaxValues(value);
    
    return processedInfo;
  };
  
  ContinuousAttributeGroup.prototype._updateMinMaxValues = function(value) {
    if(this['updateMinValue'] && ((this['minValue'] == null) || value < this['minValue'])) this['minValue'] = value;
    if(this['updateMaxValue'] && ((this['maxValue'] == null) || value > this['maxValue'])) this['maxValue'] = value; 
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.ProcessItemValue = function(attrGroupsNode) {
    return attrGroupsNode.getAttribute('value');
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.isContinuous = function() {
    return true;
  };
  
  ContinuousAttributeGroup.prototype._getRangeColors = function(amxNode) {
    var colors = [];
    var value = null;
    var maxIndex = this._getColorAttributeMaxIndex();
    
    // we need at least 2 colors
    if(maxIndex < 2) maxIndex = 2;
    for(var i=0; i < maxIndex; i++) {
      value = this['attributeValuesResolver'].resolveDefaultValue('color', i);
      colors.push(value);
    }
    return adf.mf.internal.dvt.common.attributeGroup.ColorConverter.convertArrayToRGBA(colors);
  };
  
  ContinuousAttributeGroup.prototype._getColorAttributeMaxIndex = function() {
    var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
    var attrs = this['attributes'].iterator();
    var maxIndex = -1;
    var sharedMaxIndex;
    
    while(attrs.hasNext()) {
      var vals = /^\s*color([\d]+)\s*/.exec((attrs.next()['name']));
      if(vals && vals.length == 2 && ( (maxIndex == null) || (+vals[1] > maxIndex) )) {
        maxIndex = +vals[1];
      }
    }
    
    if(this['discriminant']) {
      if(this.isSharedAttributesUpdateAllowed()) {
        AttributeGroupManager.addSharedAttribute(this['discriminant'], 'colorAttributeMaxIndex', maxIndex);
      } else {
        sharedMaxIndex = AttributeGroupManager.getSharedAttribute(this['discriminant'], 'colorAttributeMaxIndex');
        if(sharedMaxIndex > maxIndex) maxIndex = sharedMaxIndex;
      }
    }
    return maxIndex;
  };
  
  /**
   *  Creates mapping of values to colors.
   *  @param colors array of colors
   *  @param minValue min value
   *  @param maxValue max value           
   */  
  ContinuousAttributeGroup.prototype._initColorMappings = function(colors) {
    this['colors'] = colors;
    var minValue = this['minValue'], maxValue = this['maxValue'];
    
    this['mappings'] = [];
    var diff = (Math.abs(maxValue) + Math.abs(minValue)) / (colors.length - 1);
    
    // map every color to particular value
    // first color will be mapped to min value
    // last color will be mapped to max value
    var mapping = null, tmpVal = null;
    for(var i=0; i<colors.length; i++) {
      if(i==0){
        tmpVal = minValue;
      } else if (i==(colors.length - 1)) {
        tmpVal = maxValue;
      } else {
        tmpVal = tmpVal + diff;
      }
      mapping = {"value": tmpVal, "color": colors[i]};
      this['mappings'].push(mapping);
    }
  };
  
  ContinuousAttributeGroup.prototype._getRangeMappings = function(value) {
    var i;
    var mappings = this['mappings'];
    var mapping = null, rangeMappings = [];
    if(value <= this['minValue']) {
      mapping = mappings[0];
    } else if(value >= this['maxValue']) {
      mapping = mappings[mappings.length-1];
    } else {
      for(i=0; i<mappings.length; i++) {
        if(value == mappings[i].value) {
          mapping = mappings[i];
          break;
        }
      }
    }
    
    if(mapping != null) {
      rangeMappings.push(mapping);
    } else {
      for(i=0; i<mappings.length; i++) {
        if(value > mappings[i].value && value < mappings[i + 1].value) {
          rangeMappings.push(mappings[i]);
          rangeMappings.push(mappings[i+1]);
          break;
        }
      }
    }
    
    return rangeMappings;
  };
  
  /**
   *  See parent for comment.  
   */  
  ContinuousAttributeGroup.prototype.ResolveValue = function(type, appliedRules, value) {
    var resolved = appliedRules.resolveValue(type);
    
    if(resolved == null) {
      resolved = this._getColor(value);
    }
    
    return resolved;
  };
  
  /**
   *  Return css rgba color for given value.
   *  @param value value
   *  @return css rgba color for given value        
   */  
  ContinuousAttributeGroup.prototype._getColor = function(value) {
    value = +value;
    var range = this._getRangeMappings(value);
    var red = null;
    var green = null;
    var blue = null;
    var opacity = null;
    if(range.length == 1) {
      // exact match
      var col = range[0].color;
      red = col[0];
      green = col[1];
      blue = col[2];
      opacity = col[3];
    } else {
      var startCol = range[0].color;
      var startVal = range[0].value;
      var endCol = range[1].color;
      var endVal = range[1].value;
      
      // normalize
      var max, val;
      if(startVal < 0) {
        max = endVal + Math.abs(startVal);
        val = value + Math.abs(startVal);
      } else {
        max = endVal - Math.abs(startVal);
        val = value -  Math.abs(startVal);
      }
      
      var percent = Math.abs(val / max);
      
      red = startCol[0] + parseInt(percent * (endCol[0] - startCol[0]));
      green = startCol[1] + parseInt(percent * (endCol[1] - startCol[1]));
      blue = startCol[2] + parseInt(percent * (endCol[2] - startCol[2]));
      opacity = startCol[3] + (percent * (endCol[3] - startCol[3]));
    }
    return this._toRGBAColor([red, green, blue, opacity]);
  };
  
  ContinuousAttributeGroup.prototype._toRGBAColor = function(arr) {
    return "rgba("+arr[0]+", "+ arr[1]+", "+ arr[2]+ ", " + arr[3]+")";
  };
  
  /**
   *  See parrent for comment.  
   */  
  ContinuousAttributeGroup.prototype.getDescription = function() {
    var obj = ContinuousAttributeGroup.superclass.getDescription.call(this);
    obj['min'] = this['minValue'];
    obj['max'] = this['maxValue'];
    obj['minLabel'] = this['minLabel'];
    obj['maxLabel'] = this['maxLabel'];
    obj['colors'] = [];
    for(var i=0; i < this['colors'].length; i++){
      obj['colors'].push(this._toRGBAColor(this['colors'][i]));
    }
    obj['attributeType'] = 'continuous';
    return obj;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/DataItemConfig.js
 */
 (function(){
  
  /**
   *  Class representing data item configuration. Following configuration is supported:
   *  1. typeDefaultValue
   *          Default value for given type can be set. When no value is resolved for given type then this default value is set to an data item.              
   */ 
  var DataItemConfig = function()
  {
    this['defaultValues'] = {};
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DataItemConfig, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.DataItemConfig');
  
  /**
   *  Adds type default value.
   *  @param type type
   *  @param defaultValue default value        
   */   
  DataItemConfig.prototype.addTypeDefaultValue = function(type, defaultValue) {
    this['defaultValues'][type] = defaultValue;
  };
  
  /**
   *  Returns default value for given type or undefined if no value is defined.
   *  @param type type
   *  @return default value for given type or undefined if no value is defined.        
   */
  DataItemConfig.prototype.getTypeDefaultValue = function(type) {
    return this['defaultValues'][type];
  };
  
  /**
   *  Returns array of types for which default value is defined or empty array if no override exists.
   *  @return array of types for which default value is defined or empty array if no override exists.        
   */
  DataItemConfig.prototype.getDefaultValueTypes = function() {
    return Object.keys(this['defaultValues']);
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/DefaultPalettesValueResolver.js
 */
(function(){
  
  /**
   *  Default palettes values resolver. Currently supported palettes are shape, pattern and color.  
   */  
  var DefaultPalettesValueResolver = function()
  {
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DefaultPalettesValueResolver, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver');
  
  DefaultPalettesValueResolver.SHAPE = 'shape';
  DefaultPalettesValueResolver.PATTERN = 'pattern';
  DefaultPalettesValueResolver.COLOR = 'color'; 
  
  /**
   *  Returns defaults palette for given type. Returned value can be used to access defaults palette on amx nodes. 
   *  @param type type (supported types are shape, pattern, color)
   *  @return defaults palette name        
   */  
  DefaultPalettesValueResolver.getDefaultsPalette = function (type) {
    var defaultsPalette = null;
    switch (type)
    {
      case DefaultPalettesValueResolver.SHAPE:
        defaultsPalette = '_defaultShapes';
        break;
      case DefaultPalettesValueResolver.COLOR:
        defaultsPalette = '_defaultColors';
        break;
      case DefaultPalettesValueResolver.PATTERN:
        defaultsPalette = '_defaultPatterns';
        break;
      default:
        defaultsPalette = '_' + type;
    }
    return defaultsPalette;
  }; 
  
  /**
   *  Returns style defaults palette name for given type. Returned value can be used to access defaults palette on style defaults objects.
   *  @param type type (supported types are shape, pattern, color)
   *  @return style defaults palette name     
   */  
  DefaultPalettesValueResolver.getStyleDefaultsPalette = function (type) {
    var defaultsPalette = null;
    switch (type)
    {
      case DefaultPalettesValueResolver.SHAPE:
        defaultsPalette = 'shapes';
        break;
      case DefaultPalettesValueResolver.COLOR:
        defaultsPalette = 'colors';
        break;
      case DefaultPalettesValueResolver.PATTERN:
        defaultsPalette = 'patterns';
        break;
      default:
        defaultsPalette = null;
    }
    return defaultsPalette;
  };
  
  /**
   *  Returns value found on given index in defaults palette for given type.
   *  @param amxNode amx node
   *  @param type type
   *  @param index index in default palette for given type
   *  @return value found on given index in defaults palette for given type               
   */  
  DefaultPalettesValueResolver.resolveValue = function(amxNode, type, index) {
    var value = null;
    var defaults = null;
    var defaultsPalette = DefaultPalettesValueResolver.getDefaultsPalette(type);

    if(defaultsPalette && amxNode[defaultsPalette])
    {
      defaults = amxNode[defaultsPalette];          
      if(defaults != undefined && index >= 0 && defaults.length > 0) 
      {            
        value = defaults[index % defaults.length];
      }
    }
    
    return value;
  };
    
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/DiscreteAttributeGroup.js
 */
(function(){
  
  /**
   *  Discrete attribute group.  
   */  
  var DiscreteAttributeGroup = function()
  {
    adf.mf.internal.dvt.common.attributeGroup.AttributeGroup.apply(this);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DiscreteAttributeGroup, 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup', 'adf.mf.internal.dvt.common.attributeGroup.DiscreteAttributeGroup');
  
  DiscreteAttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    DiscreteAttributeGroup.superclass.Init.call(this, amxNode, attrGroupsNode);
    this['attributeType'] = 'discrete';
  };
  
  DiscreteAttributeGroup.prototype.getDescription = function() {
    var obj = DiscreteAttributeGroup.superclass.getDescription.call(this);
    obj['attributeType'] = 'discrete';
    return obj;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/LegendItems.js
 */
(function(){
  
  /**
   *  Class representing legend items. To every category and exception rule corresponds one legend item.
   *  @param types types
   *  @param categories categories
   *  @param exceptionRules exception rules
   *  @param attributeValuesResolver attribute values resolver 
   */  
  var LegendItems = function(types, categories, exceptionRules, attributeValuesResolver)
  {
    this['types'] = types;
    this['categories'] = categories;
    this['exceptionRules'] = exceptionRules; 
    this['attributeValuesResolver'] = attributeValuesResolver;
    
    this['items'] = [];
    this._createItems();
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendItems, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.LegendItems'); 
  
  /**
   *  Creates legend items array.    
   */  
  LegendItems.prototype._createItems = function () {
    var legendItem, exceptionRule;
    var attributeValuesResolver = this['attributeValuesResolver'];
    var items = this['items'];
    
    this['categories'].each(function(index, category){
       legendItem = {};
       legendItem['id'] = category['value'];
       legendItem['label'] = category['label'];
      
       attributeValuesResolver.resolveLegendValues(legendItem, index);
      
       items.push(legendItem); 
    });
    
    // create item for every exception rule
    var rules = this['exceptionRules'].getRules();
    for(var j=0; j < rules.length; j++) {
      exceptionRule = rules[j];
      
      legendItem = {};
      legendItem['id'] = exceptionRule['value'];
      legendItem['label'] = exceptionRule['label'];
      
      exceptionRule['attributes'].applyAttributes(legendItem); 
      
      this['items'].push(legendItem);
    }
    
    this['legendType'] = attributeValuesResolver.getLegendType();
  };
  
  /**
   *  Returns array of legend items. Each legend item has following form:
   *  {
   *    'id' : id,
   *    'label': label,
   *    'supported type' : type value,
   *    ...
   *    'supported type' : type value                  
   *  }     
   */  
  LegendItems.prototype.getItems = function () {
    return this['items']; 
  }; 
  
  /**
   * Returns legend type.
   */
  LegendItems.prototype.getLegendType = function() {
    return this['legendType'];
  };
    
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/attributeGroup/Rules.js
 */
(function(){
  
  var Attributes = adf.mf.internal.dvt.common.attributeGroup.Attributes;
  
  /**
   *  Class representing a set of attribute group rules. There does exist 2 types of rules: match rule and exception rule.        
   */  
  var Rules = function(matchrules, exceptionrules)
  {
    this['matchrules'] = matchrules ? matchrules : {};
    this['exceptionrules'] = exceptionrules ? exceptionrules : [];
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Rules, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Rules');
  
  /**
   *  Processes particular instance of attribute groups node and creates representation of each rule it does contain (when it does not exist yet).
   *  @param attrGroupsNode attribute groups node   
   *  @return array of applied rules indeces  
   */  
  Rules.prototype.processItemRules = function(attrGroupsNode, types) {
    var appliedExceptionRules = [], rule, child;
    
    var children = attrGroupsNode.getRenderedChildren();
    
    for (var i = 0; i < children.length; i++)
    {
      child = children[i];
      if(child.getTag().getName() == 'attributeMatchRule') {
        this._processMatchRule(child, attrGroupsNode, types);  
      }
      if(child.getTag().getName() == 'attributeExceptionRule') {
        index = this._addExceptionRule(child, attrGroupsNode, types);
        if(child.getAttribute('condition') == "true" || child.getAttribute('condition') == true) {
          appliedExceptionRules.push(index);
        }
      }
    }
    return appliedExceptionRules;
  };
  
  /**
   *  Returns rules by their indices. Type (of returned rules) can be restricted using optional ruleType parameter.
   *  This method returns instance of Rules class.   
   *  @param indices array of rule indices
   *  @param ruleType rule type
   *  @return rules in the form of Rules class instance            
   */  
  Rules.prototype.getByIndices = function(indices) {
    var exceptionrules = [];
    if(indices) {
      for(var i=0; i < indices.length; i++) {
        exceptionrules.push(this['exceptionrules'][indices[i]]);
      }
    }
    return new Rules(this['matchrules'], exceptionrules); 
  };
  
  /**
   *  Returns array of exception rules represented by this instance.
   *  Exception rules have following structure:
   *  { 
   *    'label' : 'Rule label',
   *    'attributes' : Attributes class instance,
   *    'value' : Unique string representing this rule            
   *  }
   *  
   *  @param ruleType rule type            
   *  @return array of rules.     
   */  
  Rules.prototype.getRules = function(ruleType) {
    return this['exceptionrules'];
  };
  
  /**
   *  Resolves type (e.g. color, pattern) value for the set of rules represented by this Rules class instance.  
   *  @param type type to be resolved (e.g. color, pattern)   
   *  @return value for given type or null if no value is specified for given type        
   */  
  Rules.prototype.resolveValue = function(type) {
    // match rules have been incorporated into default palettes -> process exception rules (preserve order)
    var rules = this['exceptionrules'], value;
    for(var i = rules.length-1; i >= 0; i--) {
      value = rules[i]['attributes'].resolveValue(type);
      if(value) {
        return value;
      }
    }
    return null;
  };
  
  /**
   *  Returns groups and value of last match rule for which given type (e.g. color, pattern) is defined (i.e. match rule that overrides given type).  
   *  @param type type to be resolved (e.g. color, pattern)  
   *  @return array of groups and their values for given type        
   */  
  Rules.prototype.resolveMatchRuleGroupsAndValue = function(type) {
    var ret = [], value;
    var keys = Object.keys(this['matchrules']);
    for (var i = 0, length = keys.length; i < length; i++)
    {
      var group = keys[i];
      value = this['matchrules'][group].resolveValue(type);
      if(value) ret[ret.length] = {'group': group, 'value' : value};
    }
    return ret;
  };
  
  /**
   *  For given attribute groups node and rule node returns newly created rule object. 
   *  @param ruleNode rule node
   *  @param attrGroupsNode attribute groups node     
   *  @return rule object    
   */ 
  Rules.prototype._processMatchRule = function (ruleNode, attrGroupsNode, types) {
    if(attrGroupsNode.getAttribute('value') == ruleNode.getAttribute('group')) {
      var group = ruleNode.getAttribute('group');
      var newAttributes = Attributes.processAttributes(ruleNode, types);
      if(this['matchrules'][group]) {
        this['matchrules'][group].merge(newAttributes);  
      } else {
        this['matchrules'][group] = newAttributes;  
      }
      newAttributes.merge(this['matchrules'][group]);
      
      if(newAttributes.size() > 0) {
        this['matchrules'][group] = newAttributes;  
      }
    }
  };
  
  /**
   *  Adds given exception rule to the exception rules array if it hasn't been added already.
   *  Returns rule index in the array.       
   *  @param ruleNode rule node
   *  @param attrGroupsNode attribute groups node
   *  @param types supported attribute types
   *  @return rule index in the array of all rules    
   */ 
  Rules.prototype._addExceptionRule = function (ruleNode, attrGroupsNode, types) {
    var attributes = Attributes.processAttributes(ruleNode, types);
      
    rule = {};
    rule['label'] = ruleNode.getAttribute('label');
    rule['attributes'] = attributes;
    // Sets unique identifier to a 'value' attribute of given exception rule
    rule['value'] = ruleNode.getId();
    
    var rules = this['exceptionrules'];

    // add only unique rule
    for(var i=0; i < rules.length; i++) {
      if(Rules._equals(rules[i], rule)) {
        return i;
      }
    }
    
    rules.push(rule);
    return rules.length - 1;
  };
  
  /**
   *  Returns true if rule1 equals rule2, otherwise returns false.
   *  @param rule1 first rule
   *  @param rule2 second rule      
   *  @return true if rule1 equals rule2, otherwise returns false    
   */  
  Rules._equals = function (rule1, rule2)
  {
    if(rule1 === rule2) return true;
    if(!rule1 || !rule2) return false;
    
    if(rule1['group'] != rule2['group']) return false;
    if(rule1['label'] != rule2['label']) return false;
    
    return Attributes.equals(rule1['attributes'], rule2['attributes']);
  };
    
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/AxisLineRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
    
  var AxisLineRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AxisLineRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.AxisLineRenderer');
  
  AxisLineRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = AxisLineRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['lineColor'] = {'path' : 'axisLine/lineColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'axisLine/lineWidth', 'type' : AttributeProcessor['INTEGER']};    
    attrs['rendered'] = {'path' : 'axisLine/rendered', 'type' : AttributeProcessor['ON_OFF']};
    
    return attrs;
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/AxisRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var AXIS_TYPE = 
    {
      'X' : 'xAxis',
      'Y' : 'yAxis',
      'Y2' : 'y2Axis'
    } 
    
  /**
   * processes the node representing the axis tag
   *
   * @param amxNode  the current amxNode
   * @param axisNode amxNode representing the axis tag
   * @param axisId   the axis name (xAxis, yAxis, or y2Axis)
   */
  var AxisRenderer = function (axisType)
  { 
    if(AXIS_TYPE[axisType] === undefined)
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('AxisType[' + axisType + '] not supported!');
    }
    this._axisType = AXIS_TYPE[axisType];
  } 
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AxisRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.AxisRenderer');
           
  /**
   * processes the components's child tags
   */
  AxisRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceObject' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer() },
        'referenceLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineRenderer() },
        'referenceArea' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceAreaRenderer() },
        'tickLabel' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickLabelRenderer(this._axisType === AXIS_TYPE['X']), 'maxOccurrences' : 1 },
        'axisLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.AxisLineRenderer(), 'maxOccurrences' : 1 },
        'majorTick' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickRenderer(true), 'maxOccurrences' : 1 },
        'minorTick' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickRenderer(false), 'maxOccurrences' : 1 }
      };
    }
    return this._renderers;
  } 
  
  AxisRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = AxisRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};
    attrs['axisMinValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};    
    attrs['axisMaxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['dataMinValue'] = {'path' : 'dataMin', 'type' : AttributeProcessor['FLOAT']};    
    attrs['dataMaxValue'] = {'path' : 'dataMax', 'type' : AttributeProcessor['FLOAT']};
    attrs['majorIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['FLOAT']};
    attrs['maxSize'] = {'path' : 'maxSize', 'type' : AttributeProcessor['TEXT']};
    attrs['minorIncrement'] = {'path' : 'minorStep', 'type' : AttributeProcessor['FLOAT']};
    attrs['minimumIncrement'] = {'path' : 'minStep', 'type' : AttributeProcessor['FLOAT']};
    attrs['scale'] = {'path' : 'scale', 'type' : AttributeProcessor['TEXT']};
    attrs['scaledFromBaseline'] = {'path' : 'baselineScaling', 'type' : AttributeProcessor['TEXT']};
    attrs['size'] = {'path' : 'size', 'type' : AttributeProcessor['TEXT']};
    attrs['position'] = {'path' : 'position', 'type' : AttributeProcessor['TEXT']};
    if (this._axisType === AXIS_TYPE['X'])
    {
      attrs['timeRangeMode'] = {'path' : 'timeRangeMode', 'type' : AttributeProcessor['TEXT']};
    }
    if (this._axisType === AXIS_TYPE['Y2'])
    {
      attrs['alignTickMarks'] = {'path' : 'alignTickMarks', 'type' : AttributeProcessor['ON_OFF']};
    }
    if (this._axisType === AXIS_TYPE['X'])
    {
      attrs['viewportStartGroup'] = {'path' : 'viewportStartGroup', 'type' : AttributeProcessor['TEXT']};
      attrs['viewportEndGroup'] = {'path' : 'viewportEndGroup', 'type' : AttributeProcessor['TEXT']};
    }
    if (this._axisType === AXIS_TYPE['X'] || this._axisType === AXIS_TYPE['Y'])
    {
      attrs['viewportMinValue'] = {'path' : 'viewportMin', 'type' : AttributeProcessor['TEXT']};
      attrs['viewportMaxValue'] = {'path' : 'viewportMax', 'type' : AttributeProcessor['TEXT']};
    }

    return attrs;
  }
  
  AxisRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  { 
    options[this._axisType] = options[this._axisType] ? options[this._axisType] : {};
    
    var changed = AxisRenderer.superclass.ProcessAttributes.call(this, options[this._axisType], amxNode, context);
    
    // for time axis, convert viewport limits to timestamps
    if (this._axisType === AXIS_TYPE['X'] && (context['timeAxisType'] == 'enabled' || context['timeAxisType'] == 'mixedFrequency'))
    {
      if (options[this._axisType]['viewportMin'])
      {
        options[this._axisType]['viewportMin'] = AttributeProcessor['DATETIME'](options[this._axisType]['viewportMin']);
      }
      if (options[this._axisType]['viewportMax'])
      {
        options[this._axisType]['viewportMax'] = AttributeProcessor['DATETIME'](options[this._axisType]['viewportMax']);
      }
    }
    
    return changed;
  }
  
  AxisRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    options[this._axisType] = options[this._axisType] ? options[this._axisType] : {};
    
    AxisRenderer.superclass.ProcessChildren.call(this, options[this._axisType], amxNode, context);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/ReferenceAreaItemRenderer.js
 */
(function(){
   
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var ReferenceAreaItemRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceAreaItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceAreaItemRenderer');
  
  ReferenceAreaItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceAreaItemRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }
  
  ReferenceAreaItemRenderer.prototype.ProcessAttributes = function (options, referenceAreaNode, context)
  {
    options['items'] = options['items'] ? options['items'] : [];
    
    var item = {};
    ReferenceAreaItemRenderer.superclass.ProcessAttributes.call(this, item, referenceAreaNode, context);
    
    options['items'].push(item);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/ReferenceAreaRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var ReferenceAreaRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceAreaRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceAreaRenderer');

  ReferenceAreaRenderer.prototype.GetChildRenderers = function (facetName)
  {
     if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceAreaItem' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceAreaItemRenderer() }
      };
     }
    return this._renderers;
  }

  ReferenceAreaRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getRenderedChildren(context['_currentFacet']);
  }

  /**
   * parses the referenceArea node attributes
   *
   * referenceArea has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference line
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference line
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceAreaRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceAreaRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['lineType'] = {'path' : 'lineType', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }

  ReferenceAreaRenderer.prototype.ProcessAttributes = function (options, referenceAreaNode, context)
  {
    options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];
    
    var refObj = 
    {
      'type' : 'area'
    };

    if (!referenceAreaNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    
    ReferenceAreaRenderer.superclass.ProcessAttributes.call(this, refObj, referenceAreaNode, context);
    
    context['__activeRefOBJ'] = refObj;
  }

  ReferenceAreaRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    var refObj = context['__activeRefOBJ'];
    delete context['__activeRefOBJ'];
     
    ReferenceAreaRenderer.superclass.ProcessChildren.call(this, refObj, amxNode, context);
    
    options['referenceObjects'].push(refObj);
  }

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/ReferenceLineItemRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
     
  var ReferenceLineItemRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceLineItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceLineItemRenderer');
  
  ReferenceLineItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceLineItemRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }
  
  ReferenceLineItemRenderer.prototype.ProcessAttributes = function (options, referenceLineNode, context)
  {
    options['items'] = options['items'] ? options['items'] : [];
    
    var item = {};
    ReferenceLineItemRenderer.superclass.ProcessAttributes.call(this, item, referenceLineNode, context);
    
    options['items'].push(item);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/ReferenceLineRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var ReferenceLineRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceLineRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceLineRenderer');
  
  ReferenceLineRenderer.prototype.GetChildRenderers = function (facetName)
  {
     if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceLineItem' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineItemRenderer() }
      };
    }
    return this._renderers;
  }

  ReferenceLineRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getRenderedChildren(context['_currentFacet']);
  }

  /**
   * parses the referenceLine node attributes
   *
   * referenceLine has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference line
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineType   - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference line
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceLineRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceLineRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineType'] = {'path' : 'lineType', 'type' : AttributeProcessor['TEXT']};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }

  ReferenceLineRenderer.prototype.ProcessAttributes = function (options, referenceLineNode, context)
  {
    //options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];

    var refObj = 
    {
      'type' : 'line'
    };

    if (!referenceLineNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    
    ReferenceLineRenderer.superclass.ProcessAttributes.call(this, refObj, referenceLineNode, context);
    
    context['__activeRefOBJ'] = refObj;
  }

  ReferenceLineRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    var refObj = context['__activeRefOBJ'];
    delete context['__activeRefOBJ'];

    // see if we got the array property name to populate, use 'referenceObjects' as default 
    var refObjPropertyName = context['__refObjPropertyName'];
    if (!refObjPropertyName)
      refObjPropertyName ='referenceObjects';

    // initialize the referenceObjects array
    if (options[refObjPropertyName] === undefined)
      options[refObjPropertyName] = [];
    
    ReferenceLineRenderer.superclass.ProcessChildren.call(this, refObj, amxNode, context);
    
    options[refObjPropertyName].push(refObj);
  }

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/ReferenceObjectRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
    
  var ReferenceObjectRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceObjectRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer');
  
  /**
   * parses the referenceObject node attributes
   *
   * referenceObject has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference object
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference object
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceObjectRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceObjectRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineValue'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['lowValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['highValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  ReferenceObjectRenderer.prototype.ProcessAttributes = function (options, referenceObjNode, context)
  {  
    options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];
    
    var refObj = {};
    
    var changed = ReferenceObjectRenderer.superclass.ProcessAttributes.call(this, refObj, referenceObjNode, context);

    options['referenceObjects'].push(refObj);
    
    return changed;
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/TickLabelRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
 
  var TickLabelRenderer = function(xAxis, metric)
  {
    this._isXAxis = xAxis;
    this._isMetric = metric;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TickLabelRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.TickLabelRenderer');
  
  /** parses tickLabel node attributes
   *
   *  tickLabel has the following attributes:
   *
   *  autoPrecision     - String: on, off
   *  rendered          - Boolean: true if the tickLabel should be rendered
   *  scaling           - String: auto, none, thousand, million, billion, trillion, quadrillion
   *  style             - String: font related CSS attributes
   *
   */
  TickLabelRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TickLabelRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['autoPrecision'] = {'path' : 'autoPrecision', 'type' : AttributeProcessor['TEXT']};
    attrs['scaling'] = {'path' : 'scaling', 'type' : AttributeProcessor['TEXT']};
    attrs['labelStyle'] = {'path' : 'style', 'type' : AttributeProcessor['TEXT']};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['ON_OFF'], 'default' : 'on'};
    
    if (this._isMetric === true)
    {
      attrs['textType'] = {'path' : 'textType', 'type' : AttributeProcessor['TEXT'], 'default' : 'number'};
      attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
      attrs['position'] = {'path' : 'position', 'type' : AttributeProcessor['TEXT']};
    }
    
    if (this._isXAxis === true) 
    {
      attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT']};
    }
    attrs['position'] = {'path' : 'position', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  /**
   *  converter         - Object: numberConverter or dateTimeConverter 
   */
  TickLabelRenderer.prototype.ProcessAttributes = function (options, labelNode, context)
  {
    var root = this._isMetric === true ? 'metricLabel' : 'tickLabel';    
    options[root] = options[root] ? options[root] : {};
    
    var changed = TickLabelRenderer.superclass.ProcessAttributes.call(this, options[root], labelNode, context);
    
    // if amx:convertNumber or amx:convertDateTime is used as a child tag of the tickLabel,
    // then the labelNode would have a converter object
    // we pass that converter to js chart API
    // TODO: check this
    var converter = labelNode.getConverter();
    if (converter)
    {
      changed = true;
      options[root]['converter'] = converter;     
    }
    
    return changed;
  }  
})();  
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/axis/TickRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var TickRenderer = function(majorTick)
  {
    this._majorTick = majorTick;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TickRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.TickRenderer');
  
  /**
   * processes major/minorTick node attributes
   *
   * tick has the following attributes:
   *
   * lineColor      - String(Color): support CSS color values
   * lineWidth      - Number: e.g. 1
   * rendered       - Boolean: true if the tick should be rendered
   *                  default true for major, false for minor ticks
   */
  TickRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TickRenderer.superclass.GetAttributesDefinition.call(this);
    
    var root = this._majorTick === true ? 'majorTick/' : 'minorTick/';
    
    attrs['lineColor'] = {'path' : root + 'lineColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : root + 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineStyle'] = {'path' : root + 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['rendered'] = {'path' : root + 'rendered', 'type' : AttributeProcessor['ON_OFF']};

    if (this._majorTick === true)
    {
      attrs['baselineColor'] = {'path' : root + 'baselineColor', 'type' : AttributeProcessor['TEXT']};
      attrs['baselineWidth'] = {'path' : root + 'baselineWidth', 'type' : AttributeProcessor['INTEGER']};
      attrs['baselineStyle'] = {'path' : root + 'baselineStyle', 'type' : AttributeProcessor['TEXT']};
    }
    return attrs;
  }  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/format/FormatRenderer.js
 */
(function(){
  
  var FORMAT_TYPE = 
  {
    'X' : 'x',
    'Y' : 'y',
    'Y2' : 'y2',
    'Z' : 'z',
    'PIE' : 'value',
    '*' : '*'
  } 

  /**
   * Format renderer
   * 
   * Handles rendering of the old (now deprecated) xFormat, yFormat, etc. tags.
   * The new dvtm:chartFormatRenderer is handled by the ValueFormatRenderer class.
   */
  var FormatRenderer = function(formatType)
  { 
    if(FORMAT_TYPE[formatType] === undefined)
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('FormatType[' + formatType + '] not supported!');
    }
    this._formatType = FORMAT_TYPE[formatType];
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(FormatRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.format.FormatRenderer');
  
  
  FormatRenderer.prototype.ProcessAttributes = function (options, childAmxNode, context)
  {
    var type;
    var converter;
    var tooltipLabel;
    
    if (this._formatType == '*')
    {
      // new style -- get the type from the chartValueFormat attribute
      type = childAmxNode.getAttribute('type');
    }
    else
    {
      // get type for the old format tags (xFormat, yFormat, etc.)
      type = this._formatType;
    }
    // get the converter object
    converter = childAmxNode.getConverter();
    // if no type or converter attributes defined, do nothing
    if (type)
    {
      // store the new valueFormat properties into the options/valueFormats array
      var path = new adf.mf.internal.dvt.util.JSONPath(options, 'valueFormats');
      var item = { 'type' : type };
      
      if (converter) 
      {
        item['converter'] = converter;
      }
      
      if (childAmxNode.isAttributeDefined('scaling'))
      {
        item['scaling'] = childAmxNode.getAttribute('scaling');
      }
      if (childAmxNode.isAttributeDefined('tooltipLabel'))
      {
        item['tooltipLabel'] = childAmxNode.getAttribute('tooltipLabel');
      }
      if (childAmxNode.isAttributeDefined('tooltipDisplay'))
      {
        item['tooltipDisplay'] = childAmxNode.getAttribute('tooltipDisplay');        
      }
        
      var valueFormats = path.getValue();
      // if there's no valueFormats array yet, create it
      if (valueFormats === undefined)
      {
        valueFormats = [];
        path.setValue(valueFormats);
      }
      // add the new valueFormat object
      valueFormats.push(item);
      
      return true;
    }
    // options not modified
    return false;
  }

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/format/SliceLabelFormatRenderer.js
 */
/**
 * @deprecated
 * Bug 17198668 - deprecate pie slicelabel tag
 * Bug 17198620 - uptake chart json api changes for slicelabel
 * sliceLabel is deprecated now, use attributes in pieChart like sliceLabelPosition, sliceLabelType, sliceLabelStyle
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
  
  var SliceLabelFormatRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SliceLabelFormatRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.format.SliceLabelFormatRenderer');
  
  /**
  * textType processor replaces deprecated value 'value' with value 'number' 
  */
  var SliceLabelTextTypeAttributeProcessor = function (value)
  {
    var result = AttributeProcessor['TEXT'](value);

    if (result === 'value')
    {
      result = 'number';
    }

    return result;
  }

   /** parses sliceLabel node attributes
   *  sliceLabel has the following attributes:
   *
   *  position        - String: none, inside, outside
   *  style           - String: accepts font related CSS attributes
   *  textType        - String: text, value, percent, textAndPercent
   *  //scaling         - String: auto, none, thousand, million, billion, trillion, quadrillion
   *  //autoPrecision   - String: on (default), off
   */
  SliceLabelFormatRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SliceLabelFormatRenderer.superclass.GetAttributesDefinition.call(this);
        
    var root = 'styleDefaults';
      attrs['position'] = {'path' : root + '/sliceLabelPosition', 'type' : AttributeProcessor['TEXT']}; 
      attrs['textType'] = {'path' : root + '/sliceLabelType', 'type' : SliceLabelTextTypeAttributeProcessor};
    
    return attrs;
  }
  
  /** 
   *  converter       - Object: numberConverter
   */
  SliceLabelFormatRenderer.prototype.ProcessAttributes = function (options, sliceLabelNode, context)
  {
    var changed = SliceLabelFormatRenderer.superclass.ProcessAttributes.call(this, options, sliceLabelNode, context);
    
    var converter = sliceLabelNode.getConverter();
    if (converter)
    {  
      (new adf.mf.internal.dvt.util.JSONPath(options, 'styleDefaults/sliceLabel/converter')).setValue(converter);     
      return true;
    }
    return changed;
  }  
})();
/* Copyright (c) 2013, 2016, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/DataLayerRenderer.js
 */
(function ()
{
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  var DataLayerRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DataLayerRenderer, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.layer.DataLayerRenderer');

  DataLayerRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    return this._createDataLayerChildrenNodes(amxNode);
  };

  DataLayerRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    return this._visitDataLayerChildrenNodes(amxNode, visitContext, callback);
  };

  DataLayerRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    return this._updateDataLayerChildrenNodes(amxNode, attributeChanges);
  };

  // END OF THE AMX INTERFACE
  /**
   * Create a data layer's children AMX nodes
   */
  DataLayerRenderer.prototype._createDataLayerChildrenNodes = function (amxNode)
  {
    var dataItems = amxNode.getAttribute("value");
    if (dataItems === undefined)
    {
      if (amxNode.isAttributeDefined("value"))
      {
        
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }
      // value attribute is not defined and we are in no collection mode
      // expect that childTags has attributes set independently on collection
      var children = amxNode.getTag().getChildren();
      for (var i = 0; i < children.length; i++)
      {
        var childAmxNode = children[i].buildAmxNode(amxNode);
        amxNode.addChild(childAmxNode);
      }
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
      return true;
    }
    else if (dataItems == null)
    {
      // No items, nothing to do
      return true;
    }
    var iter = adf.mf.api.amx.createIterator(dataItems);
    // copied from amx:listView - on refresh the component need to initiate
    // loading of rows not available in the cache
    if (iter.getTotalCount() > iter.getAvailableCount())
    {
      adf.mf.api.amx.showLoadingIndicator();
      //var currIndex = dataItems.getCurrentIndex();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function ()
      {
        try 
        {
          // Call the framework to have the new children nodes constructed.
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          args.setAffectedAttribute(amxNode, "value");
          adf.mf.api.amx.markNodeForUpdate(args);
        }
        finally 
        {
          adf.mf.api.amx.hideLoadingIndicator();
        }
      },
      function (req, resp)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.common.layer.DataLayerRenderer", "createChildrenNodes", "Can't fetch data!");
        adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.FINE, "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
      return true;
    }

    while (iter.hasNext())
    {
      iter.next();
      amxNode.createStampedChildren(iter.getRowKey(), null);
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  /**
   * Visits a data layer's children nodes
   */
  DataLayerRenderer.prototype._visitDataLayerChildrenNodes = function (amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    if (dataItems === undefined && !amxNode.isAttributeDefined("value"))
    {
      // visit child nodes in no collection mode since there is no value specified
      var children = amxNode.getChildren();
      for (var i = 0; i < children.length; i++)
      {
        if (children[i].visit(visitContext, callback))
        {
          return true;
        }
      }
      return false;
    }

    var iter = adf.mf.api.amx.createIterator(dataItems);
    var variableName = amxNode.getAttribute("var");

    while (iter.hasNext())
    {
      adf.mf.el.addVariable(variableName, iter.next());
      try 
      {
        if (amxNode.visitStampedChildren(iter.getRowKey(), null, null, visitContext, callback))
          return true;
      }
      finally 
      {
        adf.mf.el.removeVariable(variableName);
      }
    }
    return false;
  };

  /**
   * Update a data layer's children nodes
   */
  DataLayerRenderer.prototype._updateDataLayerChildrenNodes = function (amxNode, attributeChanges)
  {
    if (attributeChanges.hasChanged("value"))
    {
      // remove the old stamped children
      var children;
      var j;
      var iter;
      if (amxNode.getState() === adf.mf.api.amx.AmxNodeStates["INITIAL"])
      {
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
      }
      // create the new stamped children hierarchy
      var dataItems = amxNode.getAttribute("value");
      if (dataItems)
      {
        iter = adf.mf.api.amx.createIterator(dataItems);
        // copied from amx:listView - on refresh the component need to initiate
        // loading of rows not available in the cache
        if (iter.getTotalCount() > iter.getAvailableCount())
        {
          adf.mf.api.amx.showLoadingIndicator();
          //var currIndex = dataItems.getCurrentIndex();
          adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function ()
          {
            try 
            {
              // Call the framework to have the new children nodes constructed.
              var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
              args.setAffectedAttribute(amxNode, "value");
              adf.mf.api.amx.markNodeForUpdate(args);
            }
            finally 
            {
              adf.mf.api.amx.hideLoadingIndicator();
            }
          },
          function (req, resp)
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.common.layer.DataLayerRenderer", "updateChildrenNodes", "Can't fetch data!");
            adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.FINE, "updateChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
            adf.mf.api.amx.hideLoadingIndicator();
          });
          return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
        }
      }

      var oldValue = attributeChanges.getOldValue("value");
      if (oldValue)
      {
        iter = adf.mf.api.amx.createIterator(oldValue);
        while (iter.hasNext())
        {
          iter.next();
          children = amxNode.getChildren(null, iter.getRowKey());
          for (j = children.length - 1; j >= 0; j--)
          {
            amxNode.removeChild(children[j]);
          }
        }
      }

      if (dataItems)
      {
        iter = adf.mf.api.amx.createIterator(dataItems);
        while (iter.hasNext())
        {
          iter.next();
          amxNode.createStampedChildren(iter.getRowKey(), null);
        }
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'areaDataLayer', DataLayerRenderer);
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'pointDataLayer', DataLayerRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/legend/LegendRenderer.js
 */
(function()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var LegendRenderer = function()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.legend.LegendRenderer');

  /**
   * processes the components's child tags
   */
  LegendRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers = 
        {
          'legendSection' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendSectionRenderer() }
        };
    }
    return this._renderers;
  };

  LegendRenderer.prototype.GetOptions = function (options)
  {
    if (!options['legend'])
    {
      options['legend'] = {};
    }
    return options['legend'];
  };

  /**
   * Sets properties of a legend.
   *
   * The following properties are supported:
   *   rendered        - tag attribute
   *   backgroundColor - style template
   *   borderColor     - style template
   *   position        - tag attribute
   *   scrolling       - tag attribute
   *   textStyle       - style template
   *   titleHalign     - tag attribute
   *   titleStyle      - style template
   *   title           - tag attribute
   */
  LegendRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = LegendRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['rendered'] = {'path' :  'rendered', 'type' : AttributeProcessor['ON_OFF']};
    attrs['position'] = {'path' : 'position', 'type' : AttributeProcessor['TEXT']};
    attrs['scrolling'] = {'path' : 'scrolling', 'type' : AttributeProcessor['TEXT']};
    attrs['maxSize'] = {'path' : 'maxSize', 'type' : AttributeProcessor['TEXT']};
    attrs['size'] = {'path' : 'size', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'titleHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['sectionTitleHalign'] = {'path' : 'sectionTitleHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};   
    attrs['referenceObjectTitle'] = {'path' : 'referenceObjectTitle', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  LegendRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    var changed = LegendRenderer.superclass.ProcessAttributes.call(this, options, legendNode, context);
    if(changed)
    {
      options = this.GetOptions(options);
      var position = (new adf.mf.internal.dvt.util.JSONPath(options, 'position')).getValue();
    
      if(position === 'none')
      {
        (new adf.mf.internal.dvt.util.JSONPath(options, 'rendered')).setValue('off');
      }
    }

    return changed;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/legend/LegendSectionRenderer.js
 */
(function()
{
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
  
  var LegendSectionRenderer = function()
  { };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendSectionRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.legend.LegendSectionRenderer');
  
  // TODO: legendSection processing has changed
  /**
   * processes the legendSection node
   */
  LegendSectionRenderer.prototype.ProcessAttributes = function (options, legendSectionNode, context)
  {
    var amxNode = context['amxNode'];

    var agid;
    var ag;

    if (legendSectionNode.isAttributeDefined('source'))
    {
      agid = legendSectionNode.getAttribute('source');

      ag = AttributeGroupManager.findGroupById(amxNode, agid);

      // if the group could not be found by id, nothing to do here
      if (ag == null)
      {
        return;
      }

      // attribute group found, copy the info into the section legend
      var section = 
      {
        'title' : legendSectionNode.getAttribute('title'), 'items' : []
      };

      var legendItems = ag.getLegendItems();
      var legendItem = null;
      for (var i = 0;i < legendItems.length;i++)
      {
        legendItem = legendItems[i]; 
        var item = 
        {
          'id' : legendItem['id']
        };

        item.text = legendItem['label'];

        if (legendItem['color'])
        {
          item['color'] = legendItem['color'];
        }
        if (legendItem['shape'])
        {
          item['markerShape'] = legendItem['shape'];
        }
        if (legendItem['pattern'])
        {
          item['pattern'] = legendItem['pattern'];
        }

        section['items'].push(item);
      }

      var sectionsPath = (new adf.mf.internal.dvt.util.JSONPath(options, 'sections'));
      var sections = sectionsPath.getValue();
      if(!sections)
      {
        sections = [];
        sectionsPath.setValue(sections);
      }

      sections.push(section);
    }
    return false;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/overview/OverviewRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var OverviewRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(OverviewRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.overview.OverviewRenderer');
  
  /**
   * Sets properties of an overview.
   *
   * The following properties are supported:
   *   rendered        - tag attribute
   */
  OverviewRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = OverviewRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['rendered'] = {'path' :  'overview/rendered', 'type' : AttributeProcessor['ON_OFF'], 'default' : 'on'};
    attrs['inlineStyle'] = {'path' : 'overview/style', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  OverviewRenderer.prototype.ProcessAttributes = function (options, overviewNode, context)
  {
    var changed = OverviewRenderer.superclass.ProcessAttributes.call(this, options, overviewNode, context);
    
    return changed;
  }  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    exception/DvtmException.js
 */
(function()
{ 
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.exception');
   /*
   * Represents any of the DVT flavored exceptions
   */
  adf.mf.internal.dvt.exception.DvtmException = function (message)
  {
    this.name = 'DvtmException';
    this.message = (message || "Generic Dvtm Exception");
  };
  adf.mf.internal.dvt.exception.DvtmException.prototype = new Error();
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    exception/NodeNotReadyToRenderException.js
 */
(function()
{  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.exception');
  /*
   * Represents an exception when a node cannot be rendered due to missing data.
   */
  adf.mf.internal.dvt.exception.NodeNotReadyToRenderException = function (message)
  {
    this.name = 'NodeNotReadyToRenderException';
    this.message = (message || "Node not ready to render");
  };
  adf.mf.internal.dvt.exception.NodeNotReadyToRenderException.prototype = new Error();
})();
