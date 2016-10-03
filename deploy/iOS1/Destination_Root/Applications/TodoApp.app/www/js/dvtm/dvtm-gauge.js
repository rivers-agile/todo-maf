/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/BaseGaugeRenderer.js
 */
(function()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;

  var BaseGaugeRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseGaugeRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer');

  BaseGaugeRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // if inlineStyle has changed we need to recreate gauge instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // always refresh on any value change
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  BaseGaugeRenderer.prototype.getDescendentChangeAction = function (amxNode, descendentChanges)
  {
    // always refresh on any descendent change
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  /**
   * Function creates component's options, merges them with default styles,
   * and returns the coponent's main div element.
   *
   * @param amxNode
   * @return jquery div element
   */
  BaseGaugeRenderer.prototype.render = function (amxNode, id)
  {
    // set a private flag to indicate whether the node can be populated with contents
    // should an exception occur during data processing, this flag will be set to false
    this._setReadyToRender(amxNode, true);

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"]);

    try
    {
      // load resource bundles for this component
      this._loadResourceBundles(amxNode);
      // create new options object
      var options = {};
      // create new options object
      this.InitComponentOptions(amxNode, options);
      // fill newly created object with default and custom styles
      options = this.MergeComponentOptions(amxNode, options);
      // store options object to the amxNode
      this.SetDataObject(amxNode, options);
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

    return this.SetupComponent(amxNode);
   };

  /**
   * Function renders component.
   *
   * @param rootElement root element node
   * @param amxNode gauge amxNode
   */
  BaseGaugeRenderer.prototype.postDisplay = function (rootElement, amxNode)
  {
    if (this.IsAncestor(document.body, rootElement))
    {
      this.GetComponentDimensions(rootElement, amxNode);
    }

    var args = new adf.mf.api.amx.AmxNodeUpdateArguments();

    // re-schedule the actual rendering for later to move relatively expensive
    // gauge rendering out of the page display cycle
    args.setAffectedAttribute(amxNode, "_renderMeLater");
    adf.mf.api.amx.markNodeForUpdate(args);

    return; // this function is not applicable for placeholders
  };

  /**
   * Function resets component's options and re-renders component.
   *
   * @param amxNode
   * @param attributeChanges changes of current amxNode
   * @param descendentChanges changes in pontential child components
   */
  BaseGaugeRenderer.prototype.refresh = function(amxNode, attributeChanges, descendentChanges)
  {
    if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"])
    {
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["RENDERED"]);
    }
    BaseGaugeRenderer.superclass.refresh.call(this, amxNode, attributeChanges, descendentChanges);
  };

  BaseGaugeRenderer.prototype.getInputValueAttribute = function()
  {
    return "value";
  };
 
  BaseGaugeRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    BaseGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode, options);

    options['metricLabel'] = 
    {
      'rendered' : 'on',
      'scaling' : 'auto'
    };
  };

  /**
   * Function is called in refresh phase and should reset the options object according to attributeChanges parameter.
   * 
   * @param amxNode
   * @param attributeChanges
   * @param descendentChanges
   */
  BaseGaugeRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {   
    BaseGaugeRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);
    // must clear the thresholds and referenceLines arrays, if they exist
    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      if (options['thresholds'])
      {
        options['thresholds'] = [];
      }
      if (options['referenceLines'])
      {
        options['referenceLines'] = [];
      }
      if (attributeChanges.getChangedAttributeNames().indexOf("value") >= 0) // if value has changed
      {
        amxNode.setAttributeResolvedValue('changed', true); // this is just 'internal' change for node
        //amxNode.setAttribute('changed', true); - THIS WOULD CHANGE ALSO EL EXPRESSION - sometimes this can be usefull
        options['changed'] = true;
      }
    }
  };

  /**
   * processes the components's child tags
   */
  BaseGaugeRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      var TickLabelRenderer = adf.mf.internal.dvt.common.axis.TickLabelRenderer;
      this._renderers = 
        {
          'referenceLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineRenderer() },
          'tickLabel' : { 'renderer' : new TickLabelRenderer(), 'maxOccurrences' : 1 },
          'metricLabel' : { 'renderer' : new TickLabelRenderer(false, true), 'maxOccurrences' : 1 },
          'gaugeLabelFormat' : { 'renderer' : new TickLabelRenderer(false, true), 'maxOccurrences' : 1 },
          'threshold' : { 'renderer' : new adf.mf.internal.dvt.gauge.ThresholdRenderer() }
        };
    }
    return this._renderers;
  };

  BaseGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BaseGaugeRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['visualEffects'] = {'path' : 'visualEffects', 'type' : AttributeProcessor['TEXT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 65, 'default' : 65};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 0, 'default' : 0};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 100, 'default' : 100};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : null, 'default' : null};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['readOnly'] = {'path' : 'readOnly', 'type' : AttributeProcessor['BOOLEAN'], 'default' : true};
    attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT']};
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'off'};

    return attrs;
  };

  BaseGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = BaseGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-gaugeIndicatorArea'] = [
      {'path' : 'borderColor', 'type' : StyleProcessor['BORDER_COLOR'], 'overwrite' : false }, 
      {'path' : 'borderRadius', 'type' : StyleProcessor['BORDER_RADIUS'], 'overwrite' : false }, 
      {'path' : 'color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false }
    ];
    styleClasses['dvtm-gaugeMetricLabel'] = {'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']};    

    return styleClasses; 
  };

  BaseGaugeRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomGaugeStyle';
  };

  BaseGaugeRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;
    
    if (!this.IsSkyros())
    {
      currentStyle = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(adf.mf.internal.dvt.gauge.DefaultGaugeStyle.SKIN_ALTA, 
                                        adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1);
    }
    else
    {
      return adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1;
    }
    return currentStyle;
  };

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {    
    var changed = BaseGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);

    // bug 18406297: turn off data animation when the value is undefined
    if (options['value'] === undefined || options['value'] === null || isNaN(options['value']))
    {
      options['animationOnDataChange'] = 'none';
    }

    return changed;
  };

  /**
   * Function processes supported childTags which are on amxNode.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseGaugeRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    context['__refObjPropertyName'] = 'referenceLines';
    var changed = BaseGaugeRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    delete context['__refObjPropertyName'];

    return changed;
  };

  BaseGaugeRenderer.prototype.CreateComponentCallback = function(amxNode)
  {
    var callbackObject = 
      {
        'callback' : function (event, component)
        {
          var type = event['type'];
          if (type === 'valueChange')
          {
            var newValue = event['newValue'];
            var oldValue = event['oldValue'];
            // fire the valueChange event if the value has changed
            if (newValue !== oldValue)
            {
              var vce = new adf.mf.api.amx.ValueChangeEvent(oldValue, newValue);
              adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);
            }
          }
        }
      };
    return callbackObject;
  };

  BaseGaugeRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  { 
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = this.GetDataObject(amxNode);
    }
    instance.render(data, width, height);  
  };

  BaseGaugeRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;

    var bundles = BaseGaugeRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtGaugeBundle'));

    return bundles;
  };

  /**
   * Determines if the component should prevent propagation of swipe/drag gestures.
   * Components that handle swipe/drag internally should not propagate events further
   * to their containers to avoid gesture conflicts. By default, all DVT components
   * propagation of swipe/drag start events. The type handler should override this method
   * when the component is mostly static and should propagate drag/swipe gestures to its
   * container.
   */
  BaseGaugeRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // if gauge accepts input, prevent event propagation
    if (amxNode.isAttributeDefined('readOnly') && adf.mf.api.amx.isValueFalse(amxNode.getAttribute('readOnly')))
      return true;
    // for read-only gauges, let the events go through
    return false;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/DialGaugeRenderer.js
 */
(function(){

  var dialGaugeStyles = {};
  var dialGaugeStylesResolved = false;
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
   
  var DialGaugeRenderer = function ()
  { }
  
  DialGaugeRenderer.DEFAULT_HEIGHT = 150;  
  DialGaugeRenderer.DEFAULT_WIDTH = 150;

  adf.mf.internal.dvt.DvtmObject.createSubclass(DialGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.DialGaugeRenderer');
 
  DialGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = DialGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-gaugeTickLabel'] = 
    {
      'builderFunction' : createDialGaugeClassFunction('dvtm-gaugeTickLabel'),
      'path' : 'tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']
    }; 
    
    styleClasses['dvtm-gaugeMetricLabel'] = 
    {
      'builderFunction' : createDialGaugeClassFunction('dvtm-gaugeMetricLabel'),
      'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']
    }
    
    return styleClasses; 
  } 
  
  var createDialGaugeClassFunction = function (baseClass)
  {
    return function (amxNode)
    {
      if(amxNode.isAttributeDefined('background'))
      {
        return baseClass + ' dvtm-dialGauge-background-' + amxNode.getAttribute('background');
      }
      else
      {
        return baseClass;
      }
    }
  }
 
  DialGaugeRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    DialGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    
    options['tickLabel'] = 
      {
        'rendered' : 'on',
        'scaling' : 'auto'
      };
  }
  
  DialGaugeRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = DialGaugeRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    // if style template exists, load predefined backgrounds/indicators
    if (!dialGaugeStylesResolved)
    {
      dialGaugeStylesResolved = true;

      dialGaugeStyles['backgrounds'] = adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle['backgrounds'];
      dialGaugeStyles['indicators'] = adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle['indicators'];

      // if CustomDialGaugeStyle is defined, merge it with the default style
      if (window['CustomDialGaugeStyle'] != undefined)
      {
        var item, imgs, imgIndx, keys, i, length;
        if (window['CustomDialGaugeStyle']['backgrounds'] != undefined)
        {
          keys = Object.keys(window['CustomDialGaugeStyle']['backgrounds']);
          for (i = 0, length = keys.length; i < length; i++)
          {
            item = keys[i];
            dialGaugeStyles['backgrounds'][item] = window['CustomDialGaugeStyle']['backgrounds'][item];
            imgs = dialGaugeStyles['backgrounds'][item]["images"];
            for (imgIndx = 0;imgIndx < imgs.length;imgIndx++)
            {
              imgs[imgIndx]["src"] = adf.mf.api.amx.buildRelativePath(imgs[imgIndx]["source"]);
            }
          }
        }
        if (window['CustomDialGaugeStyle']['indicators'] != undefined)
        {
          keys = Object.keys(window['CustomDialGaugeStyle']['indicators']);
          for (i = 0, length = keys.length; i < length; i++)
          {
            item = keys[i];
            dialGaugeStyles['indicators'][item] = window['CustomDialGaugeStyle']['indicators'][item];
            imgs = dialGaugeStyles['indicators'][item]["images"];
            for (imgIndx = 0;imgIndx < imgs.length;imgIndx++)
            {
              imgs[imgIndx]["src"] = adf.mf.api.amx.buildRelativePath(imgs[imgIndx]["source"]);
            }
          }
        }
      }
    }
    return options;
  }

  DialGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = DialGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['inputIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['GAUGE_STEP']};
    return attrs;
  }
  
  DialGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = DialGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    var dialGaugeBackground = amxNode.getAttribute('background');
    var dialGaugeIndicator = amxNode.getAttribute('indicator');
   
    if (!dialGaugeBackground || dialGaugeStyles['backgrounds'][dialGaugeBackground] === undefined)
    {
      var b2iMap = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS['indicatorToBackground'];
      var defaultDialGaugeBackground = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES['background'];
      dialGaugeBackground = this._getValueByKeyWithDefault(b2iMap, dialGaugeIndicator, defaultDialGaugeBackground);
      changed = true;
    }
    
    if (!dialGaugeIndicator || dialGaugeStyles['indicators'][dialGaugeIndicator] === undefined)
    {
      var i2bMap = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS['backgroundToIndicator'];
      var defaultDialGaugeIndicator = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES['indicator'];
      dialGaugeIndicator = this._getValueByKeyWithDefault(i2bMap, dialGaugeBackground, defaultDialGaugeIndicator);
      changed = true;
    }
           
    options['background'] = dialGaugeStyles['backgrounds'][dialGaugeBackground];          
    options['indicator'] = dialGaugeStyles['indicators'][dialGaugeIndicator];  
    return changed;
  }
  
  DialGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.DialGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  } 
   
  DialGaugeRenderer.prototype.GetComponentWidtht = function (node, amxNode)
  {
    var width =  DialGaugeRenderer.superclass.GetComponentWidtht.call(this, node, amxNode);
    if(width <= 1)
    {
      width = DialGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  DialGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  DialGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = DialGaugeRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
    /**
   * @param map
   * @param key 
   * @param defaultValue - optional
   * 
   * @return value from map for given key, defaultValue when there is no value for key in map. 
   *    If not specified, defaultValue is 'undefined';
   */
  DialGaugeRenderer.prototype._getValueByKeyWithDefault = function(map, key, defaultValue)
  {
    var value = undefined;
    if(map && key)
    {
      value = map[key];
    }
    if (value === undefined)
    {
      value = defaultValue;
    }
    return value;
  }
        
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'dialGauge', DialGaugeRenderer); 
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/GaugeDefaults.js
 */
(function() {  

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.gauge');

  adf.mf.internal.dvt.gauge.DefaultGaugeStyle = {};

  adf.mf.internal.dvt.gauge.DefaultGaugeStyle.SKIN_ALTA =
  {
    // skin id
    'skin' : 'alta'
  };
  
  adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1 = 
  {
    // skin id
    'skin' : 'skyros',
    // default animation duration in milliseconds
    'animationDuration': 1000,
    // default animation effect on data change
    'animationOnDataChange': "none",
    // default animation effect on gauge display
    'animationOnDisplay': "none",
    // default visual effect
    'visualEffects': "auto"
  };
  
  adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES = 
  {
    'background' : 'circleAntique',
    'indicator' : 'needleAntique'
  };
  
  adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS = 
  {
    'indicatorToBackground':
    {
      'needleAlta' : 'circleAlta',
      'needleAntique' : 'circleAntique',
      'needleLight' : 'circleLight',
      'needleDark' : 'circleDark'
    },
    
    'backgroundToIndicator' : 
    {
      'rectangleAlta' : 'needleAlta',
      'domeAlta' : 'needleAlta',
      'circleAlta' : 'needleAlta',
      
      'rectangleAntique' : 'needleAntique',
      'rectangleAntiqueCustom' : 'needleAntique',
      'domeAntique' : 'needleAntique',
      'domeAntiqueCustom' : 'needleAntique',
      'circleAntique' : 'needleAntique',
      'circleAntiqueCustom' : 'needleAntique',
      
      'rectangleLight' : 'needleLight',
      'rectangleLightCustom' : 'needleLight',
      'domeLight' : 'needleLight',
      'domeLightCustom' : 'needleLight',
      'circleLight' : 'needleLight',
      'circleLightCustom' : 'needleLight',
      
      'rectangleDark' : 'needleDark',
      'rectangleDarkCustom' : 'needleDark',
      'domeDark' : 'needleDark',
      'domeDarkCustom' : 'needleDark',
      'circleDark' : 'needleDark',
      'circleDarkCustom' : 'needleDark'
    }
  };
    
  // location of dial gauge resources
  var _dialGaugePath = 'css/images/chart/gauge/';
  var translatePath = function (path)
  {
    return _dialGaugePath + path;
  };
  
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle = 
  {
    'backgrounds' : 
    {
      "rectangleAlta" : 
      {
        "anchorX" : 100,
        "anchorY" : 103,
        "startAngle" : 202.5,
        "angleExtent" : 225,
        "indicatorLength" : .85,
        "radius": 60,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("alta/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("alta/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 309,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 309
        } ],
        "metricLabelBounds" :
        {
          "x" : 83,
          "y" : 86,
          "width" : 34,
          "height" : 34
        }
      },      
      
      "domeAlta" : 
      {
        "anchorX" : 100,
        "anchorY" : 103,
        "startAngle" : 202.5,
        "angleExtent" : 225,
        "indicatorLength" : .85,
        "radius": 60,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("alta/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("alta/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 309,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 309
        } ],
        "metricLabelBounds" :
        {
          "x" : 83,
          "y" : 86,
          "width" : 34,
          "height" : 34
        }
      },
      
      "circleAlta" : 
      {
        "anchorX" : 100,
        "anchorY" : 103,
        "startAngle" : 202.5,
        "angleExtent" : 225,
        "indicatorLength" : 0.85,
        "radius": 60,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("alta/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("alta/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("alta/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 86,
          "width" : 40,
          "height" : 34
        }
      },
      
      "rectangleAntique" : 
      {
        "anchorX" : 100.5,
        "anchorY" : 95.8,
        "startAngle" : 207.6,
        "angleExtent" : 235,
        "indicatorLength" : 1.05,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 168,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 168
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 335,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 335
        } ],
        "metricLabelBounds" :
        {
          "x" : 79,
          "y" : 125,
          "width" : 42,
          "height" : 40
        }
      },      
      
      "domeAntique" : 
      {
        "anchorX" : 99.3,
        "anchorY" : 95.8,
        "startAngle" : 195.5,
        "angleExtent" : 210.8,
        "indicatorLength" : 0.98,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 176,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 176
        },
        {
          "src" : translatePath("antique/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 352,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 352
        } ],
        "metricLabelBounds" :
        {
          "x" : 81,
          "y" : 135,
          "width" : 38,
          "height" : 35
        }
      },
      
      "circleAntique" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.85,
        "radius": 63,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("antique/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 77,
          "y" : 133,
          "width" : 46,
          "height" : 34
        }
      },

      "rectangleLight" : 
      {
        "anchorX" : 100,
        "anchorY" : 91.445,
        "startAngle" : 211,
        "angleExtent" : 242,
        "indicatorLength" : 1.1,
        "radius": 60.5,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 78,
          "y" : 75,
          "width" : 44,
          "height" : 38
        }
      },
      
      "domeLight" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "radius": 57,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("light/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 70,
          "width" : 41,
          "height" : 39
        }
      },

      "circleLight" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.82,
        "radius": 60,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("light/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },
      
      "circleDark" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.5,
        "indicatorLength" : 0.82,
        "radius": 63,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("dark/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },

      "rectangleDark" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 99.5,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.1,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 83,
          "width" : 41,
          "height" : 36
        }
      },

      "domeDark" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "radius": 57,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("dark/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 73,
          "width" : 41,
          "height" : 36
        }
      }
    },

    'indicators' : 
    {
      "needleAlta" : 
      {
        "anchorX" : 187,
        "anchorY" : 388,
        "images" : [
        {
          "src" : translatePath("alta/needle-1600x1600.png"),
          "width" : 375,
          "height" : 570
        } ]
      },

      "needleAntique" : 
      {
        "anchorX" : 42,
        "anchorY" : 510,
        "images" : [
        {
          "src" : translatePath("antique/needle-1600x1600.png"),
          "width" : 81,
          "height" : 734
        } ]
      },

      "needleLight" : 
      {
        "anchorX" : 227,
        "anchorY" : 425,
        "images" : [
        {
          "src" : translatePath("light/needle-1600x1600.png"),
          "width" : 454,
          "height" : 652
        } ]
      },

      "needleDark" : {
        "anchorX" : 227,
        "anchorY" : 425,
        "images" : [
        {
          "src" : translatePath("dark/needle-1600x1600.png"),
          "width" : 454,
          "height" : 652
        } ]
      }
    }
  };

  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleAntiqueCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleAntique"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeAntiqueCustomCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeAntique"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleAntiqueCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleAntique"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleLightCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleLight"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeLightCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeLight"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleLightCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleLight"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleDarkCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["circleDark"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleDarkCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["rectangleDark"];
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeDarkCustom"] = 
          adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle ['backgrounds'] ["domeDark"];
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/LedGaugeRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
   
  var LedGaugeRenderer = function ()
  { }
  
  LedGaugeRenderer.DEFAULT_HEIGHT = 80;  
  LedGaugeRenderer.DEFAULT_WIDTH = 100;

  adf.mf.internal.dvt.DvtmObject.createSubclass(LedGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.LedGaugeRenderer');
    
  LedGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = LedGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['size'] = {'path' : 'size', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['title'] = {'path' : 'title/text', 'type' : AttributeProcessor['TEXT']};
    attrs['titleStyle'] = {'path' : 'title/style', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  LedGaugeRenderer.prototype.CreateComponentCallback = function(amxNode)
  {
    return null;
  }
  
  LedGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.LedGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }
  
  LedGaugeRenderer.prototype.GetComponentWidth = function (node, amxNode)
  {
    var width = LedGaugeRenderer.superclass.GetComponentWidth.call(this, node, amxNode);
    if(width <= 1)
    {
      width = LedGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  LedGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  LedGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = LedGaugeRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
  LedGaugeRenderer.prototype.ProcessStyleClasses = function (node, amxNode)
  {
    LedGaugeRenderer.superclass.ProcessStyleClasses.call(this, node, amxNode);
    
    // make sure metricLabel/labelStyle overrides the default skin settings
    var options = this.GetDataObject(amxNode);
    var children = amxNode.getChildren();
    for (var i = 0; i < children.length; i++) 
    {
      if (children[i].getTag().getName() === 'metricLabel') {
        if (children[i].isAttributeDefined('labelStyle'))
        {
          options['metricLabel']['style'] = children[i].getAttribute('labelStyle');
        }
        break;
      }
    }
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'ledGauge', LedGaugeRenderer); 
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/RatingGaugeRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var RatingGaugeRenderer = function ()
  { }
  
  RatingGaugeRenderer.DEFAULT_HEIGHT = 30;  
  RatingGaugeRenderer.MAX_HEIGHT = 50;  
  RatingGaugeRenderer.DEFAULT_WIDTH = 160;

  adf.mf.internal.dvt.DvtmObject.createSubclass(RatingGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.RatingGaugeRenderer');

  RatingGaugeRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    RatingGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    
    options['selectedState'] = {};
    options['unselectedState'] = {};
    options['hoverState'] = {};
    options['changedState'] = {};
  }
  
  RatingGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = RatingGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 3, 'default' : 3};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 0, 'default' : 0};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 5, 'default' : 5};
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['inputIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['RATING_STEP']};
    attrs['readOnly'] = {'path' : 'readOnly', 'type' : AttributeProcessor['BOOLEAN'], 'default' : false};
    attrs['changed'] = {'path' : 'changed', 'type' : AttributeProcessor['BOOLEAN'], 'default' : false};
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT']};
    attrs['selectedColor'] = {'path' : 'selectedState/color', 'type' : AttributeProcessor['TEXT']};
    attrs['selectedBorderColor'] = {'path' : 'selectedState/borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['unselectedColor'] = {'path' : 'unselectedState/color', 'type' : AttributeProcessor['TEXT']};
    attrs['unselectedBorderColor'] = {'path' : 'unselectedState/borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['changedColor'] = {'path' : 'changedState/color', 'type' : AttributeProcessor['TEXT']};
    attrs['changedBorderColor'] = {'path' : 'changedState/borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['hoverColor'] = {'path' : 'hoverState/color', 'type' : AttributeProcessor['TEXT']};
    attrs['hoverBorderColor'] = {'path' : 'hoverState/borderColor', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  RatingGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = RatingGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
  
    styleClasses['dvtm-ratingGaugeSelected'] = [
      {'path' : 'selectedState/color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false},
      {'path' : 'selectedState/borderColor', 'type' : StyleProcessor['BORDER_COLOR_TOP'], 'overwrite' : false}
    ];
    styleClasses['dvtm-ratingGaugeUnselected'] = [
      {'path' : 'unselectedState/color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}, 
      {'path' : 'unselectedState/borderColor', 'type' : StyleProcessor['BORDER_COLOR_TOP'], 'overwrite' : false}
    ];
    styleClasses['dvtm-ratingGaugeHover'] = [
      {'path' : 'hoverState/color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}, 
      {'path' : 'hoverState/borderColor', 'type' : StyleProcessor['BORDER_COLOR_TOP'], 'overwrite' : false}];
    styleClasses['dvtm-ratingGaugeChanged'] = [
      {'path' : 'changedState/color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}, 
      {'path' : 'changedState/borderColor', 'type' : StyleProcessor['BORDER_COLOR_TOP'], 'overwrite' : false}
    ];
    return styleClasses; 
  }  
          
  RatingGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    RatingGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    var DEFAULT_SHAPE = 'star';  
    var shape = DEFAULT_SHAPE;
    var unselectedShape;
    var changedShape;
    
    if (amxNode.isAttributeDefined('shape')) 
    {
      shape = amxNode.getAttribute('shape');
    }
    options['selectedState']['shape'] = shape;
    // make the 'changed' and 'hover' states follow the selected shape
    options['hoverState']['shape'] = shape;
    options['changedState']['shape'] = shape;
  
    if (amxNode.isAttributeDefined('unselectedShape'))
    {
      unselectedShape = amxNode.getAttribute('unselectedShape');
      // if 'auto', follow the selected shape
      if (unselectedShape === 'auto')
        options['unselectedState']['shape'] = shape;
      else
        options['unselectedState']['shape'] = unselectedShape;
    }
    else 
    {
      options['unselectedState']['shape'] = shape;
    }

    if (amxNode.isAttributeDefined('changedShape'))
    {
      changedShape = amxNode.getAttribute('changedShape');
      // if 'auto', follow the selected shape
      if (changedShape === 'auto')
        options['changedState']['shape'] = shape;
      else
        options['changedState']['shape'] = changedShape;
    }
    else 
    {
      options['changedState']['shape'] = shape;
    }
    
    return true;
  }

  RatingGaugeRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers = 
        {
          'threshold' : { 'renderer' : new adf.mf.internal.dvt.gauge.ThresholdRenderer() }
        };
    }
    return this._renderers;
  }
  
  RatingGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {   
    var instance = dvt.RatingGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }
  
  RatingGaugeRenderer.prototype.GetComponentWidtht = function (node, amxNode)
  {
    var width = RatingGaugeRenderer.superclass.GetComponentWidtht.call(this, node, amxNode);
    if(width <= 1)
    {
      width = RatingGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  RatingGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height = RatingGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = RatingGaugeRenderer.DEFAULT_HEIGHT;
    }
    else if(height > RatingGaugeRenderer.MAX_HEIGHT)
    {
      if (amxNode.getAttribute("orientation") == "horizontal")
        height = RatingGaugeRenderer.MAX_HEIGHT;
    }
    
    return height;
  }
  
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'ratingGauge', RatingGaugeRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/StatusMeterGaugeRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var StatusMeterGaugeRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(StatusMeterGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.StatusMeterGaugeRenderer');

  StatusMeterGaugeRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    StatusMeterGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    
    options['indicatorSize'] = 1;
    options['thresholdDisplay'] = 'onIndicator';
    options['plotArea'] = 
      {
        'rendered' : 'auto'
      }; 
  }
  
  StatusMeterGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StatusMeterGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['angleExtent'] = {'path' : 'angleExtent', 'type' : AttributeProcessor['INTEGER']};
    attrs['borderRadius'] = {'path' : 'borderRadius', 'type' : AttributeProcessor['TEXT']};
    attrs['indicatorSize'] = {'path' : 'indicatorSize', 'type' : AttributeProcessor['PERCENTAGE2']};
    attrs['inputIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['GAUGE_STEP']};
    attrs['innerRadius'] = {'path' : 'innerRadius', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT'], 'default' : 'horizontal'};    
    attrs['plotArea'] = {'path' : 'plotArea/rendered', 'type' : AttributeProcessor['TEXT']};
    attrs['plotAreaColor'] = {'path' : 'plotArea/color', 'type' : AttributeProcessor['TEXT']};
    attrs['plotAreaBorderColor'] = {'path' : 'plotArea/borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['plotAreaBorderRadius'] = {'path' : 'plotArea/borderRadius', 'type' : AttributeProcessor['TEXT']};
    attrs['startAngle'] = {'path' : 'startAngle', 'type' : AttributeProcessor['INTEGER']};
    attrs['title'] = {'path' : 'title/text', 'type' : AttributeProcessor['TEXT']};
    attrs['titlePosition'] = {'path' : 'title/position', 'type' : AttributeProcessor['TEXT']};
    attrs['titleStyle'] = {'path' : 'title/style', 'type' : AttributeProcessor['TEXT']};

    attrs['thresholdDisplay'] = {'path' : 'thresholdDisplay', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  StatusMeterGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = StatusMeterGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-gaugeMetricLabel'] = {'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']};    
    styleClasses['dvtm-gaugePlotArea'] = [
      {'path' : 'plotArea/borderColor', 'type' : StyleProcessor['BORDER_COLOR'], 'overwrite' : false},
      {'path' : 'plotArea/borderRadius', 'type' : StyleProcessor['BORDER_RADIUS'], 'overwrite' : false},
      {'path' : 'plotArea/color', 'type' : StyleProcessor['BACKGROUND'], 'overwrite' : false}
    ];
        
    return styleClasses; 
  }  
  
  StatusMeterGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.StatusMeterGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }  
  
  StatusMeterGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  StatusMeterGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = 40;
    }
    return height;
  }
   
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'statusMeterGauge', StatusMeterGaugeRenderer); 
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    gauge/ThresholdRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
  
  var ThresholdRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ThresholdRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.gauge.ThresholdRenderer');
  
  /**
   * parses the threshold node attributes
   *
   * threshold has the following attributes
   *
   *   borderColor - String(Color): support CSS color values
   *   color       - String(Color): support CSS color values
   *   text        - String: the threshold text
   *   value       - Number: the breakpoint of the range
   *
   */
  ThresholdRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ThresholdRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
   
    return attrs;
  }
  
  ThresholdRenderer.prototype.ProcessAttributes = function (options, thresholdNode, context)
  {
    var threshold = {};

    var changed = ThresholdRenderer.superclass.ProcessAttributes.call(this, threshold, thresholdNode, context);

    options['thresholds'] = options['thresholds'] ? options['thresholds'] : [];
    options['thresholds'].push(threshold);
    
    return changed;
  }  
})();
