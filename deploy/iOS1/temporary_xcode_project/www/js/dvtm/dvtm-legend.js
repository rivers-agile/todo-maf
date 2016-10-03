/* Copyright (c) 2013, 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    StandaloneLegendItemRenderer.js
 */
(function ()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var StandaloneLegendItemRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(StandaloneLegendItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.legend.StandaloneLegendItemRenderer');

  StandaloneLegendItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StandaloneLegendItemRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['borderColor'] = {'path' :  'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['categories'] = {'path' :  'categories', 'type' : AttributeProcessor['STRINGARRAY']};
    attrs['color'] = {'path' :  'color', 'type' : AttributeProcessor['TEXT']};
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['ON_OFF']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['TEXT']};
    attrs['markerColor'] = {'path' : 'markerColor', 'type' : AttributeProcessor['TEXT']};
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT']};
    attrs['pattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['source'] = {'path' : 'source', 'type' : AttributeProcessor['TEXT']};
    attrs['symbolType'] = {'path' : 'symbolType', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  StandaloneLegendItemRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var item = {
      'id' : amxNode.getId()
    };

    StandaloneLegendItemRenderer.superclass.ProcessAttributes.call(this, item, amxNode, context);

    options['items'].push(item);
  };
})();
/* Copyright (c) 2013, 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    StandaloneLegendRenderer.js
 */
(function ()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var StandaloneLegendRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(StandaloneLegendRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.legend.StandaloneLegendRenderer');

  /**
   * @param {String} facetName an optional name of the facet containing the items to be rendered
   * @return object that describes child renderers of the component.
   */
  StandaloneLegendRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (!this._renderers)
    {
      this._renderers = 
      {
        'legendSection' : {'renderer' : new adf.mf.internal.dvt.legend.StandaloneLegendSectionRenderer()}
      };
    }
    return this._renderers;
  };

  StandaloneLegendRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getRenderedChildren();
  };

  StandaloneLegendRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StandaloneLegendRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['ON_OFF']};
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['TEXT']};
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT']};
    attrs['scrolling'] = {'path' : 'scrolling', 'type' : AttributeProcessor['TEXT']};
    attrs['halign'] = {'path' : 'halign', 'type' : AttributeProcessor['TEXT']};
    attrs['valign'] = {'path' : 'valign', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'titleHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};
    attrs['titleStyle'] = {'path' : 'titleStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['symbolHeight'] = {'path' : 'symbolHeight', 'type' : AttributeProcessor['INTEGER']};
    attrs['symbolWidth'] = {'path' : 'symbolWidth', 'type' : AttributeProcessor['INTEGER']};

    return attrs;
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  StandaloneLegendRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = StandaloneLegendRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-legend'] = [{'path' : 'textStyle', 'type' : StyleProcessor['CSS_TEXT']},{'path' : 'backgroundColor', 'type' : StyleProcessor['BACKGROUND']},{'path' : 'borderColor', 'type' : StyleProcessor['TOP_BORDER_WHEN_WIDTH_GT_0PX']}];
    styleClasses['dvtm-legendTitle'] = {'path' : 'titleStyle', 'type' : StyleProcessor['CSS_TEXT'], 'overwrite' : false};
    styleClasses['dvtm-legendSectionTitle'] = {'path' : 'sectionTitleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    return styleClasses;
  };

  /**
   * Initialize generic options for all chart component.
   */
  StandaloneLegendRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    StandaloneLegendRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    // create simple legend options with empty section object
    options['sections'] = [];

    var suffix = this.IsRTL() ? '-r' : '';
    options['_resources'] = 
    {
      'closedEnabled' : 'css/images/legend/alta/closed-ena' + suffix + '.png',
      'closedOver' : 'css/images/legend/alta/closed-ovr' + suffix + '.png',
      'closedDown' : 'css/images/legend/alta/closed-dwn' + suffix + '.png',
      'openEnabled' : 'css/images/legend/alta/open-ena' + suffix + '.png',
      'openOver' : 'css/images/legend/alta/open-ovr' + suffix + '.png',
      'openDown' : 'css/images/legend/alta/open-dwn' + suffix + '.png'
    };
  };

  StandaloneLegendRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  StandaloneLegendRenderer.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  /**
   * Reset options for all chart component.
   */
  StandaloneLegendRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    StandaloneLegendRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);
    // reset sections
    this.InitComponentOptions(amxNode, options);
  };

  StandaloneLegendRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomLegendStyle';
  };

  StandaloneLegendRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.Legend.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  };

  StandaloneLegendRenderer.prototype.RefreshComponent = function(amxNode, attributeChanges, descendentChanges)
  {
      StandaloneLegendRenderer.superclass.RefreshComponent.call(this, amxNode, attributeChanges, descendentChanges)
      // reset current dimensions to allow component to adjust size
      // to its content
      this.ResetComponentDimensions(document.getElementById(this.GetComponentId(amxNode)), amxNode);
  };

  /**
   * Function renders instance of the component
   */
  StandaloneLegendRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {
    var data = this.GetDataObject(amxNode);

    instance.render(data, width, height);
  };

  StandaloneLegendRenderer.prototype.GetPreferredSize = function (simpleNode, amxNode, width, height)
  {
    var componentInstance = this.GetComponentInstance(simpleNode, amxNode);
    if (componentInstance.getPreferredSize)
    {
      // find out if there is user defined width and height
      var uh = DOMUtils.parseStyleSize(simpleNode.style.height) || DOMUtils.parseStyleSize(simpleNode.style.height, true);
      var uw = DOMUtils.parseStyleSize(simpleNode.style.width) || DOMUtils.parseStyleSize(simpleNode.style.width, true);
      // get preferred size of the component based on the data and computed
      // dimensions
      if (!uh || !uw)
      {
        // there is no constrain so use maximum space available
        // use 10000 since it is bug number and svg safe
        if (height <= 1)
        {
          height = 10000;
        }
        // same as above
        if (width <= 1)
        {
          width = 10000;
        }
        // preffered size based on the component's data and constrained by the maximum
        // possible width and height
        var size = componentInstance.getPreferredSize(this.GetDataObject(amxNode), width, height);
        // replace size with preffered size in case that there is no user defined size
        width = uw ? null : size['w'];
        height = uh ? null : size['h'];
        // return preferred size
        return { 'w' : width, 'h' : height };
      }
    }
    // in all other cases return null so base width and height should be used instead of the
    // preferred size
    return null;
  };

  /**
   * Function creates callback for the toolkit component which is common for the legent component
   */
  StandaloneLegendRenderer.prototype.CreateComponentCallback = function (amxNode)
  {
    var renderer = this;
    var callbackObject =
    {
      'callback' : function (event, component)
      {
        if (event['type'] === 'dvtDrill')
        {
          var id = event['id'] || null;
          var series = event['series'] || null;
          var key = null;
          if (id)
          {
            var stampedNode = renderer.findAmxNode(amxNode, id);
            if (stampedNode)
            {
              key = stampedNode.getStampKey();
            }
          }
          var drillEvent = new adf.mf.api.dvt.ChartDrillEvent(id, key, series, null);
          adf.mf.api.amx.processAmxEvent(amxNode, 'drill', undefined, undefined, drillEvent);
        }
      }
    };
    return callbackObject;
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'legend', StandaloneLegendRenderer);
})();
/* Copyright (c) 2013, 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    StandaloneLegendSectionRenderer.js
 */
(function ()
{
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var StandaloneLegendSectionRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(StandaloneLegendSectionRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.legend.StandaloneLegendSectionRenderer');

  StandaloneLegendSectionRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getRenderedChildren();
  };

  StandaloneLegendSectionRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (!this._renderers)
    {
      this._renderers =
      {
        'legendItem' :
        {
          'renderer' : new adf.mf.internal.dvt.legend.StandaloneLegendItemRenderer()
        }
      };
    }
    return this._renderers;
  };

  StandaloneLegendSectionRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StandaloneLegendSectionRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['disclosed'] = {'path' :  'expanded', 'type' : AttributeProcessor['TEXT']};
    attrs['showDisclosure'] = {'path' : 'collapsible', 'type' : AttributeProcessor['TEXT']};
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'titleHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['titleStyle'] = {'path' : 'titleStyle', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  StandaloneLegendSectionRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var section = {
      'items' : []
    };

    StandaloneLegendSectionRenderer.superclass.ProcessAttributes.call(this, section, amxNode, context);

    context['__activeSection'] = section;
  };

  var _timeouts = {};
  var _args = {};

  StandaloneLegendSectionRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var section = context['__activeSection'];
    delete context['__activeSection'];

    var discriminant = amxNode.getAttribute('source');
    if (discriminant)
    {
      var id = amxNode.getParent().getId();
      var mapper = this.CreateMapper(discriminant, section['items']);
      // map initial categories for one discriminant
      var categories = AttributeGroupManager.getSharedCategories(discriminant);
      mapper(categories);
      // add this mapper as an observer for discriminant to get 
      // notification about any changes in categories
      AttributeGroupManager.observeSharedCategories(discriminant, function (cat)
      {
        // categories have changed
        // so legend has to be rerendered
        // but there might be too many 
        // refreshes so setTimeout is used to 
        // filter multiple calls of the markForUpdate
        // function
        var timeout = _timeouts[id];
        if (timeout)
        {
          clearTimeout(timeout);
          delete _timeouts[id];
        }

        if (mapper(cat))
        {
          _args[id] = _args[id] || new adf.mf.api.amx.AmxNodeUpdateArguments();
          _args[id].setAffectedAttribute(amxNode, "_categories");
        }

        _timeouts[id] = setTimeout(function (jid)
        {
            var args = _args[jid]
            delete _timeouts[jid];
            delete _args[jid];

            adf.mf.api.amx.markNodeForUpdate(args);
        }, 100, id);
      });
    }
    else
    {
      StandaloneLegendSectionRenderer.superclass.ProcessChildren.call(this, section, amxNode, context);
    }

    options['sections'].push(section);
  };

  StandaloneLegendSectionRenderer.prototype.CreateMapper = function (discriminant, items)
  {
    return function (cats)
    {
      var oldItems = items;
      var changed = oldItems.length !== (cats && cats.categories ? cats.categories.length : 0);

      items.length = 0;

      if (cats)
      {
        var colors = AttributeGroupManager.getSharedAttribute(discriminant, "palette.color");
        var shapes = AttributeGroupManager.getSharedAttribute(discriminant, "palette.shape");
        var patterns = AttributeGroupManager.getSharedAttribute(discriminant, "palette.pattern");
        var i = 0;
        cats.each(function (index)
        {
          var label = cats.getLabelByIndex(index);
          var value = cats.getValueByIndex(index);
          var text = label || value;
          if (text)
          {
            var color = colors ? colors[index % colors.length] : null;
            var shape = shapes ? shapes[index % shapes.length] : null;
            var pattern = patterns ? patterns[index % patterns.length] : null;

            changed = changed
                     || !oldItems[i]
                    || (oldItems[i]['text'] !== text
                     || oldItems[i]['color'] !== color
                     || oldItems[i]['markerShape'] !== shape
                     || oldItems[i]['pattern'] !== pattern);

            items.push(
            {
              'text' : text,
              'color' : color || null,
              'markerShape' : shape || null,
              'pattern' : pattern || null
            });
            i++;
          }
        });
      }
      return changed;
    };
  };
})();
