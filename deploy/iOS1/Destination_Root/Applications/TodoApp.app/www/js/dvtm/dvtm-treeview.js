/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreeviewUtils.js
 */
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;
  
  var TreeviewUtils = {};
  adf.mf.internal.dvt.treeview.TreeviewUtils = TreeviewUtils;
  
  TreeviewUtils.copyOptionIfDefined = function (options, fromPath, toPath)
  {
    var value = new JSONPath(options, fromPath).getValue();
    if (value)
    {
      new JSONPath(options, toPath).setValue(value);
    }
  };
  
  TreeviewUtils.getMergedStyleValue = function (options, path)
  {
    return new JSONPath(options, path).getValue();
  };
  
  TreeviewUtils.isAttributeGroupNode = function (amxNode)
  {
    if(amxNode && amxNode.getTag() && amxNode.getTag().getName() === 'attributeGroups')
    {
      return true;
    }
    return false;
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreeModelBuilder.js
 */
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  var TreeModelBuilder = {};
  adf.mf.internal.dvt.treeview.TreeModelBuilder = TreeModelBuilder;
 
  TreeModelBuilder.createModelNodes = function (options, amxNode, context)
  {
    var dataItems = amxNode["_dataItems"];
    var ignoredProps = (function() {
      return {
        props : ['attrGroups'],
        contains : function (arg) {
           return this.props.indexOf(arg) > -1;
        }
      };
    })();
    
    var i, j, length, length2, dataItem, node, detachedGroups, config, randomColor;
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
    
    for (i = 0, length = dataItems.length; i < length; i++)
    {
      dataItem = dataItems[i];
      
      node = {};
      // copy properties
      var keys = Object.keys(dataItem);
      for (j = 0, length2 = keys.length; j < length2; j++)
      {
    	var key = keys[j];
        if (dataItem.hasOwnProperty(key)) 
        {
          // copy every non private and non ingored string property to node object
          if(typeof key === 'string' && key.indexOf('_') !== 0 && !ignoredProps.contains(key))
          {
            node[key] = dataItem[key];
          }
        }
      }

      detachedGroups = dataItem['_detachedGroups']
      AttributeGroupManager.attachProcessedAttributeGroups(context, detachedGroups);
      
      config = new adf.mf.internal.dvt.common.attributeGroup.DataItemConfig();
      randomColor = DefaultPalettesValueResolver.resolveValue(amxNode, DefaultPalettesValueResolver.COLOR, i);
      config.addTypeDefaultValue(DefaultPalettesValueResolver.COLOR, randomColor);
      
      AttributeGroupManager.registerDataItem(context, node, config);

      options["nodes"].push(node);
    }
  };
  
})();
/* Copyright (c) 2013, 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/BaseTreeviewRenderer.js
 */
(function ()
{
  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var TreeModelBuilder = adf.mf.internal.dvt.treeview.TreeModelBuilder;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  /**
   * Common renderer for all tree views.
   */
  var BaseTreeviewRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseTreeviewRenderer, 'adf.mf.internal.dvt.DataStampRenderer', 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer');

  /**
   * @param {Object} amxNode
   * @return the chart type or null
   */
  BaseTreeviewRenderer.prototype.GetChartType = function ()
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = BaseTreeviewRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    if (!options['nodeDefaults'])
    {
      options['nodeDefaults'] = {};
    }

    // almost every property can have default value -> some defautls are handled by toolkit using nodeDefaults options property
    // some are handled by renderer (in GetAttributesDefinition function)
    // set toolkit defaults
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelDisplay', 'nodeDefaults/labelDisplay');
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelHalign', 'nodeDefaults/labelHalign');
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelValign', 'nodeDefaults/labelValign');

    // extract default colors from styleDefaults and dispose styleDefaults so that it's not passed to toolkit
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults)
    {
      if (styleDefaults['colors'])
      {
        amxNode['_defaultColors'] = styleDefaults['colors'];
      }
      if (styleDefaults['patterns'])
      {
        amxNode['_defaultPatterns'] = styleDefaults['patterns'];
      }
      delete options['styleDefaults'];// remove styleDefaults from options, no longer needed
    }
    return options;
  };

  BaseTreeviewRenderer.prototype.GetStyleComponentName = function ()
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.SetupComponent = function (amxNode)
  {
    var outerDiv = BaseTreeviewRenderer.superclass.SetupComponent.call(this, amxNode);

    var inlineStyle = amxNode.getAttribute("inlineStyle");
    var styleClass = amxNode.getAttribute("styleClass");

    var classes = this.GetOuterDivClass() + " ";
    if (styleClass)
    {
      classes += styleClass;
    }

    if (!inlineStyle)
    {
      inlineStyle = "";
    }

    outerDiv.className = (outerDiv.className + " " + classes);

    var currStyle = outerDiv.getAttribute('style');
    if (!currStyle)
      currStyle = "";

    currStyle = currStyle.replace(/^\s+|\s+$/g, '');
    if (currStyle.length > 0 && !(currStyle.lastIndexOf(";") === (currStyle.length - 1)))
    {
      currStyle = currStyle + ";";
    }
    outerDiv.setAttribute('style', currStyle + inlineStyle);

    return outerDiv;
  };

  /**
   * Returns outer div class if any
   * @abstract
   * @returns outer div class if any
   */
  BaseTreeviewRenderer.prototype.GetOuterDivClass = function ()
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = BaseTreeviewRenderer.superclass.GetAttributesDefinition.call(this, amxNode);

    // set renderer defaults where needed
    var styleCName = this.GetStyleComponentName();
    var options = this.GetDataObject(amxNode);

    attrs['animationDuration'] = {'path' : 'animationDuration', 'type' : AttributeProcessor['INTEGER'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationDuration')};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationOnDisplay')};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationOnDataChange')};
    attrs['nodeSelection'] = {'path' : 'selectionMode', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/nodeSelection')};
    attrs['sorting'] = {'path' : 'sorting', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/sorting')};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/emptyText')};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['sizeLabel'] = {'path' : 'sizeLabel', 'type' : AttributeProcessor['TEXT']};
    attrs['colorLabel'] = {'path' : 'colorLabel', 'type' : AttributeProcessor['TEXT']};
    attrs['legendSource'] = {'path' : 'legendSource', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  /**
   * Initialize generic options.
   */
  BaseTreeviewRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    BaseTreeviewRenderer.superclass.InitComponentOptions.call(this, amxNode, options);

    options["nodeDefaults"] = {};
    options["nodes"] = [];

    // if the data attribute is defined, use it to initialize the data object
    if (amxNode.isAttributeDefined('data'))
    {
      options["nodes"] = amxNode.getAttribute('data');
    }

    options["type"] = this.GetChartType();

    amxNode["_dataItems"] = [];
    AttributeGroupManager.reset(amxNode);
    amxNode['_stylesResolved'] = false;
  };

  BaseTreeviewRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    var state = BaseTreeviewRenderer.superclass.updateChildren.call(this, amxNode, attributeChanges);
    if (attributeChanges.hasChanged('selectedRowKeys'))
    {
      // discard all user changes to the selection to allow newly defined selectedRowKeys to be processed
      amxNode.setAttributeResolvedValue('_selection', null);
      // in case that the result of superclass call is none than force refresh
      // in case that it is rerender or replace we are keeping original
      // state
      if (state < adf.mf.api.amx.AmxNodeChangeResult['REFRESH'])
      {
        state = adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
      }
    }
    return state;
  };

  BaseTreeviewRenderer.prototype.setSelectedAndIsolatedNodes = function (amxNode)
  {
    var changed = false;
    var userSelection = amxNode.getAttribute("_selection");
    var isolatedRowKey = amxNode.isAttributeDefined("isolatedRowKey") ? amxNode.getAttribute("isolatedRowKey") : null;
    var selectedRowKeys = null;
    var options = this.GetDataObject(amxNode);

    if (userSelection == null)
    {
      selectedRowKeys = amxNode.isAttributeDefined("selectedRowKeys") ? AttributeProcessor['ROWKEYARRAY'](amxNode.getAttribute("selectedRowKeys")) : null;
    }
    else 
    {
      changed = true;
      options["selection"] = userSelection;
    }

    if (isolatedRowKey || (selectedRowKeys && selectedRowKeys.length > 0))
    {
      if (!amxNode.isAttributeDefined('value'))
      {
        return this._processIsolatedAndSelectedNodesForRowKey(amxNode, isolatedRowKey, selectedRowKeys, null);
      }
      else 
      {
        var value = amxNode.getAttribute('value');
        if (value)
        {
          var iter = adf.mf.api.amx.createIterator(value);
          while (iter.next())
          {
            changed = changed | this._processIsolatedAndSelectedNodesForRowKey(amxNode, isolatedRowKey, selectedRowKeys, iter.getRowKey());
          }
        }
      }
    }

    amxNode.setAttributeResolvedValue("_selection", options["selection"]);

    return changed;
  };

  /**
   *
   * @param {Object} amxNode parent amxNode
   * @param {String} isolatedRowKey isolated node rowkey
   * @param {Array} selectedRowKeys array of selected rowkeys
   * @param {String} masterRowKey stamped collection rowkey or null for static data
   * @returns {Boolean} indicates wheter options object was modified
   */
  BaseTreeviewRenderer.prototype._processIsolatedAndSelectedNodesForRowKey = function (amxNode, isolatedRowKey, selectedRowKeys, masterRowKey)
  {
    var options = this.GetDataObject(amxNode);
    var treeviewNodes = amxNode.getChildren(null, masterRowKey);
    var changed = false;

    var iter2 = adf.mf.api.amx.createIterator(treeviewNodes);
    while (iter2.hasNext())
    {
      var treeviewNode = iter2.next();
      var id = treeviewNode.getId();
      var rowKey;

      if (masterRowKey === null)
      {
        rowKey = iter2.getRowKey() + '';
      }
      else 
      {
        rowKey = treeviewNode.getStampKey();
      }

      if (isolatedRowKey !== null)
      {
        if (rowKey === isolatedRowKey)
        {
          options["isolatedNode"] = id;
          changed = true;
        }
      }
      if (selectedRowKeys !== null)
      {
        if (selectedRowKeys.indexOf(rowKey) >  - 1)
        {
          if (!options["selection"])
          {
            options["selection"] = [];
          }
          options["selection"].push(id);
          changed = true;
        }
      }
    }

    return changed;
  };

  /**
   * Check if renderer is running in dtmode. If so then load only dummy data. In other case leave processing on the
   * parent.
   */
  BaseTreeviewRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.startMonitorCall("Render tree children", adf.mf.log.level.FINER, "adf.mf.internal.dvt.treeview.BaseTreeviewRenderer.ProcessChildren");
    try 
    {
      if (adf.mf.environment.profile.dtMode)
      {
        var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition('treeView');
        var dtModeData = definition.getDTModeData();

        options['nodes'] = dtModeData['nodes'];

        if (amxNode.isAttributeDefined('displayLevelsChildren'))
        {
          this.enforceLevelsChildren(options['nodes'], amxNode.getAttribute('displayLevelsChildren'));
        }

        return true;
      }
      else 
      {
        AttributeGroupManager.init(context);

        var changed = BaseTreeviewRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
        changed = changed | this.setSelectedAndIsolatedNodes(amxNode);

        //build tree model
        TreeModelBuilder.createModelNodes(options, amxNode, context);

        var updateCategories = function (attrGrp, dataItem, valueIndex, exceptionRules)
        {
          if (!dataItem['categories'])
            dataItem['categories'] = [];
          var categories = dataItem['categories'];

          if (attrGrp.isContinuous())
          {
            categories.push(attrGrp.getId() + ":" + valueIndex);
          }
          else 
          {
            categories.push(attrGrp.getId() + ":" + attrGrp.getCategoryValue(valueIndex));
          }

          var rules = exceptionRules.getRules();
          for (var i = 0;i < rules.length;i++)
          {
            categories.push(attrGrp.getId() + ":" + rules[i]['value']);
          }
        };

        // process attribute groups
        var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
        config.addTypeToItemAttributeMapping('fillColor', adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.COLOR);
        config.addTypeToDefaultPaletteMapping('fillColor', adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.COLOR);
        config.addTypeToItemAttributeMapping('fillPattern', adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.PATTERN);
        config.addTypeToDefaultPaletteMapping('fillPattern', adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.PATTERN);
        config.setUpdateCategoriesCallback(updateCategories);

        AttributeGroupManager.applyAttributeGroups(amxNode, config, context);

        // if legendSource is defined add corresponding attribute group description to the options
        var legendSource = options['legendSource'];
        var attrGroup = AttributeGroupManager.findGroupById(amxNode, legendSource);

        if (attrGroup)
        {
          if (!options["attributeGroups"])
          {
            options["attributeGroups"] = [];
          }
          options["attributeGroups"].push(attrGroup.getDescription());
        }

        return changed;
      }
    }
    finally 
    {
      perf.stop();
    }
  };

  BaseTreeviewRenderer.prototype.enforceLevelsChildren = function (nodes, level)
  {
    if (!nodes)
      return;
    if (level < 0)
      level = 0;
    if (level === 0)
    {
      for (var i = 0;i < nodes.length;i++)
      {
        if (nodes[i].nodes)
          nodes[i].nodes = null;
      }
    }
    else 
    {
      for (var i = 0;i < nodes.length;i++)
      {
        this.enforceLevelsChildren(nodes[i].nodes, level - 1);
      }
    }
  };

  /**
   * Reset options for all treeview components.
   */
  BaseTreeviewRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    BaseTreeviewRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);

    // make a note that this is a refresh phase
    amxNode['_attributeChanges'] = attributeChanges;

    if (attributeChanges.hasChanged('value') || descendentChanges)
    {
      amxNode["_dataItems"] = [];
    }

    options["nodes"] = [];

    AttributeGroupManager.reset(amxNode);
    if (options["selection"])
    {
      options["selection"] = null;
    }
    if (options["selectedNodes"])
    {
      options["selectedNodes"] = null;
    }
  };

  /**
   * Function creates callback for the toolkit component which is common for all treeview components
   */
  BaseTreeviewRenderer.prototype.CreateComponentCallback = function (amxNode)
  {
    var renderer = this;
    var callbackObject = 
    {
      'callback' : function (event, component)
      {
        if (event['type'] === 'selection')
        {
          // selectionChange event support
          var selection = event['selection'];
          if (selection !== undefined)
          {
            var selectedRowKeys = [];
            var selectedIds = [];
            for (var i = 0;i < selection.length;i++)
            {
              var itemNode = renderer.findAmxNode(amxNode, selection[i]);
              if (itemNode)
              {
                var stampKey = itemNode.getStampKey();
                selectedRowKeys.push(stampKey);
                selectedIds.push(itemNode.getId());
              }
            }

            var userSelection = amxNode.getAttribute("_selection") || [];
            // filter all removed keys
            var removedIDs = renderer.filterArray(userSelection, function (id)
            {
              return selectedIds.indexOf(id) ===  - 1;
            }) || [];

            var removedKeys = removedIDs.map(function (id)
            {
              return renderer.findAmxNode(amxNode, id);
            });

            var se = new adf.mf.api.amx.SelectionEvent(removedKeys, selectedRowKeys);
            adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se);

            amxNode.setAttributeResolvedValue("_selection", selectedIds);
          }
        }
      }
    };
    return callbackObject;
  };

  BaseTreeviewRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    var width = dim['width'];
    var height = dim['height'];

    var widthThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_WIDTH / 3);
    var heightThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_HEIGHT / 3);

    if (width - widthThreshold < 0 || height - heightThreshold < 0)
    {
      var ratio;
      if (width - widthThreshold < height - heightThreshold)
      {
        ratio = height / width;
        width = widthThreshold;
        height = width * ratio;
      }
      else 
      {
        ratio = width / height;
        height = heightThreshold;
        width = height * ratio;
      }
    }

    return { 'width' : width, 'height' : height };
  };

  /**
   * Function renders instance of the component
   */
  BaseTreeviewRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {
    var data = null;
    if (this.IsOptionsDirty(amxNode))
    {
      data = this.GetDataObject(amxNode);
    }
    var dim = this.AdjustStageDimensions(
    {
      'width' : width, 'height' : height
    });
    instance.render(data, dim['width'], dim['height']);
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/BaseTreeviewNodeRenderer.js
 */
(function(){

  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var BaseTreeviewNodeRenderer = function()
  {};
  

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseTreeviewNodeRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer');

  BaseTreeviewNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = BaseTreeviewNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);

    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['label'] = {'path' : 'label', 'type' : AttributeProcessor['TEXT']};
    attrs['fillColor'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['fillPattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['labelDisplay'] = {'path' : 'labelDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['labelHalign'] = {'path' : 'labelHalign', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  BaseTreeviewNodeRenderer.prototype.ProcessAttributes = function (options, treeviewNode, context)
  {
    var amxNode = context['amxNode'];
    var dataItem = this.CreateTreeViewNode(amxNode, treeviewNode, context);

    if(dataItem)
    {
      dataItem['_rowKey'] = context['_rowKey'];
      dataItem['id'] = treeviewNode.getId();
      // always process all attributes -> temporarily delete _attributeChanges
      var currentAttributeChanges = context['_attributeChanges'];
      context['_attributeChanges'] = null;

      // process marker attributes
      BaseTreeviewNodeRenderer.superclass.ProcessAttributes.call(this, dataItem, treeviewNode, context);

      context['_attributeChanges'] = currentAttributeChanges;

      amxNode["_dataItems"].push(dataItem);

      var childNodes = treeviewNode.getChildren();
      var iter3 = adf.mf.api.amx.createIterator(childNodes);
      while (iter3.hasNext())
      {
        var childNode = iter3.next();

        if(!TreeviewUtils.isAttributeGroupNode(childNode))
        {
          continue;
        }

        if (childNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(childNode.getAttribute('rendered')))
          continue;         // skip unrendered nodes

        if (!childNode.isReadyToRender())
        {
          throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
        }
        AttributeGroupManager.processAttributeGroup(childNode, amxNode, context);
      }
      var detached = AttributeGroupManager.detachProcessedAttributeGroups(context);
      dataItem['_detachedGroups'] = detached;
    }

    context["dataItem"] = dataItem;

    return true;
  };


  BaseTreeviewNodeRenderer.prototype.CreateTreeViewNode = function (amxNode, treeviewNode, context)
  {
    var attr;

    // first check if this data item should be rendered at all
    attr = treeviewNode.getAttribute('rendered');
    if (attr !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(attr))
        return null;
    }

    var dataItem =
    {
      'attrGroups' : []
    };

    return dataItem;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/SunburstNodeRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SunburstNodeRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SunburstNodeRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer', 'adf.mf.internal.dvt.treeview.SunburstNodeRenderer');
  
  
  SunburstNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SunburstNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['radius'] = {'path' : 'radius', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/SunburstRenderer.js
 */
(function(){

  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SunburstRenderer = function ()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SunburstRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer', 'adf.mf.internal.dvt.treeview.SunburstRenderer');
 
  SunburstRenderer.prototype.GetChartType = function ()
  {
    return 'sunburst';
  };
  
  SunburstRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      var SunburstNodeRenderer = adf.mf.internal.dvt.treeview.SunburstNodeRenderer;
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      this._renderers = 
      {
        'stamped' : {
          'sunburstNode' : { 'renderer' : new SunburstNodeRenderer()}
        },
        'simple' : {
          'legend' : { 'renderer' : new LegendRenderer(), 'maxOccurrences' : 1 }
        }
      };
    }
   
    if(facetName) 
    {
      return this._renderers['stamped'];
    }
    else
    {
      return this._renderers['simple'];
    }
  };
  
  SunburstRenderer.prototype.GetStyleComponentName = function () {
    return 'sunburst';
  };
  
  SunburstRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SunburstRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    var options = this.GetDataObject(amxNode);
    
    attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT'],  'default' : TreeviewUtils.getMergedStyleValue(options, 'sunburst/rotation')};
    attrs['rotationAngle'] = {'path' : 'startAngle', 'type' : AttributeProcessor['INTEGER'],  'default' : TreeviewUtils.getMergedStyleValue(options, 'sunburst/rotationAngle')};

    return attrs;
  };
  
  SunburstRenderer.prototype.GetOuterDivClass = function ()
  {
    return "dvtm-sunburst";
  };
  
  SunburstRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = SunburstRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-sunburstNode'] = [{'path' : 'nodeDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-sunburstNodeSelected'] = [{'path' : 'nodeDefaults/selectedOuterColor', 'type' : StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'nodeDefaults/selectedInnerColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-sunburstNodeLabel'] = [{'path' : 'nodeDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    styleClasses['dvtm-sunburstAttributeTypeLabel'] = [{'path' : 'styleDefaults/_attributeTypeTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-sunburstAttributeValueLabel'] = [{'path' : 'styleDefaults/_attributeValueTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    return styleClasses;
  };
  
  SunburstRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomSunburstStyle';
  };
  
  SunburstRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.treeview.DefaultSunburstStyle;
  };
  
  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return stamped child tag name
   */
  SunburstRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    return "sunburstNode";
  };
  
  SunburstRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return dvt.Sunburst.newInstance(context, callback, callbackObj);
  };
  
  SunburstRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;
    
    var bundles = SunburstRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtSunburstBundle'));
    
    return bundles;
  };
  
  SunburstRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // sunburst should prevent swipe gestures when 'rotation' attribute is defined
    if (amxNode.isAttributeDefined('rotation') && amxNode.getAttribute('rotation') !== 'off')
    {
      return true;
    }
    return false;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'sunburst', SunburstRenderer);
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreemapNodeHeaderRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var TreemapNodeHeaderRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapNodeHeaderRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.treeview.TreemapNodeHeaderRenderer');
  
  TreemapNodeHeaderRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapNodeHeaderRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['isolate'] = {'path' : 'isolate', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'labelHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['useNodeColor'] = {'path' : 'useNodeColor', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };
  
  TreemapNodeHeaderRenderer.prototype.ProcessAttributes = function (options, treemapHeaderNode, context)
  {
    var dataItem = context["dataItem"];
    dataItem['header'] = {};
    
    if(dataItem)
    {
      // always process all attributes -> temporarily delete _attributeChanges
      var currentAttributeChanges = context['_attributeChanges'];
      context['_attributeChanges'] = null;
      
      TreemapNodeHeaderRenderer.superclass.ProcessAttributes.call(this, dataItem['header'], treemapHeaderNode, context);
      
      context['_attributeChanges'] = currentAttributeChanges;
    }
    return true;
  };
  
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreemapNodeRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var TreemapNodeRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapNodeRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer', 'adf.mf.internal.dvt.treeview.TreemapNodeRenderer');
  
  TreemapNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['labelValign'] = {'path' : 'labelValign', 'type' : AttributeProcessor['TEXT']};
    attrs['groupLabelDisplay'] = {'path' : 'groupLabelDisplay', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  };
  
  TreemapNodeRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      var TreemapNodeHeaderRenderer = adf.mf.internal.dvt.treeview.TreemapNodeHeaderRenderer;
      this._renderers = 
        {
          'treemapNodeHeader' : { 'renderer' : new TreemapNodeHeaderRenderer()}
        };
    }
   
    return this._renderers;
  };
  
  TreemapNodeRenderer.prototype.ProcessChildren = function (options, layerNode, context)
  {
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;
    
    return TreemapNodeRenderer.superclass.ProcessChildren.call(this, options, layerNode, context);
  };
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreemapRenderer.js
 */
(function(){
  
  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;

  var TreemapRenderer = function ()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer', 'adf.mf.internal.dvt.treeview.TreemapRenderer');
 
  TreemapRenderer.prototype.GetChartType = function ()
  {
    return 'treemap';
  };
  
  TreemapRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      var TreemapNodeRenderer = adf.mf.internal.dvt.treeview.TreemapNodeRenderer;
      this._renderers = 
      {
        'stamped' : {
          'treemapNode' : { 'renderer' : new TreemapNodeRenderer(), 'order' : 1}
        },
        'simple' : {
          'legend' : { 'renderer' : new LegendRenderer(), 'maxOccurrences' : 1 }
        }
      };
    }
    
    if(facetName) 
    {
      return this._renderers['stamped'];
    }
    else
    {
      return this._renderers['simple'];
    }
  };
  
  /**
   * Initialize treemap options.
   */
  TreemapRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    TreemapRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    
    if (options["nodeDefaults"]["header"] === undefined)
    {
      options["nodeDefaults"]["header"] = {};
    }
  };
  
  TreemapRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = TreemapRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    // set toolkit defaults
    TreeviewUtils.copyOptionIfDefined(options, 'node/groupLabelDisplay', 'nodeDefaults/groupLabelDisplay');
    TreeviewUtils.copyOptionIfDefined(options, 'header/isolate', 'nodeDefaults/header/isolate');
    TreeviewUtils.copyOptionIfDefined(options, 'header/titleHalign', 'nodeDefaults/header/labelHalign');
    TreeviewUtils.copyOptionIfDefined(options, 'header/useNodeColor', 'nodeDefaults/header/useNodeColor');

    return options;
  };
  
  TreemapRenderer.prototype.GetStyleComponentName = function () {
    return 'treemap';
  };
  
  TreemapRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    var options = this.GetDataObject(amxNode);
    
    // set options
    attrs['layout'] = {'path' : 'layout', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, 'treemap/layout')};
    attrs['groupGaps'] = {'path' : 'groupGaps', 'type' : AttributeProcessor['TEXT'], 'default': TreeviewUtils.getMergedStyleValue(options, 'treemap/groupGaps')};

    return attrs;
  };
  
  TreemapRenderer.prototype.GetOuterDivClass = function ()
  {
    return "dvtm-treemap";
  };
  
  TreemapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = TreemapRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-treemapNodeSelected'] = [{'path' : 'nodeDefaults/selectedOuterColor', 'type' : StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'nodeDefaults/selectedInnerColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-treemapNodeHeader'] = [{'path' : 'nodeDefaults/header/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'nodeDefaults/header/borderColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-treemapNodeHeaderSelected'] = [{'path' : 'nodeDefaults/header/selectedOuterColor', 'type' : StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'nodeDefaults/header/selectedInnerColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-treemapNodeHeaderHover'] = [{'path' : 'nodeDefaults/header/hoverOuterColor', 'type' : StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'nodeDefaults/header/hoverInnerColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-treemapNodeLabel'] = [{'path' : 'nodeDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-treemapNodeHeaderLabel'] = [{'path' : 'nodeDefaults/header/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    styleClasses['dvtm-treemapAttributeTypeLabel'] = [{'path' : 'styleDefaults/_attributeTypeTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-treemapAttributeValueLabel'] = [{'path' : 'styleDefaults/_attributeValueTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    return styleClasses;
  };
  
  TreemapRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomTreemapStyle';
  };
  
  TreemapRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.treeview.DefaultTreemapStyle;
  };
  
  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return stamped child tag name
   */
  TreemapRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    return "treemapNode";
  };
  
  TreemapRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return dvt.Treemap.newInstance(context, callback, callbackObj);
  };
  
  TreemapRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;
    
    var bundles = TreemapRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtTreemapBundle'));
    
    return bundles;
  };
  
  TreemapRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // treemap does not prevent swipe gestures to be handled by its container
    return false;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'treemap', TreemapRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    treeview/TreeviewDefaults.js
 */
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  adf.mf.internal.dvt.treeview.DefaultTreemapStyle =
  {
    // treemap properties
    "treemap" : {
      // Animation effect when the data changes - none, auto
      //"animationOnDataChange": "auto",
      // Specifies the animation that is shown on initial display - none, auto
      //"animationOnDisplay": "auto",
      // Specifies the animation duration in milliseconds
      //"animationDuration": "500",
      // The text of the component when empty
      //"emptyText": "No data to display",
      // Specifies whether gaps are displayed between groups - outer, all, none
      //"groupGaps": "all",
      // Specifies the layout of the treemap - squarified, sliceAndDiceHorizontal, sliceAndDiceVertical
      //"layout": "squarified",
      // Specifies the selection mode - none, single, multiple
      //"nodeSelection": "multiple",
      // Specifies whether whether the nodes are sorted by size - on, off
      //"sorting": "on"
    },
    // treemap node properties
    "node" : {
      // The label display behavior for group nodes - header, node, off
      //"groupLabelDisplay": "off",
      // The label display behavior for nodes - node, off
      //"labelDisplay": "off",
      // The horizontal alignment for labels displayed within the node - center, start, end
      //"labelHalign": "end",
      // The vertical alignment for labels displayed within the node - center, top, bottom
      //"labelValign": "center"
    },
    // treemap node header properties
    "header" : {
      // Specifies whether isolate behavior is enabled on the node - on, off
      //"isolate": "on",
      // The horizontal alignment of the title of this header - start, end, center
      //"titleHalign": "start",
      // Specifies whether the node color should be displayed in the header - on, off
      //"useNodeColor": "on"
    },
    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default patterns palette
      'patterns' : ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"]
    }
  };  
  
  adf.mf.internal.dvt.treeview.DefaultSunburstStyle =
  {
    // sunburst properties
    "sunburst" : {
      // is client side rotation enabled? - on, off
      //"rotation": "off",
      // The text of the component when empty
      //"emptyText": "No data to display",
      // Specifies the selection mode - none, single, multiple
      //"nodeSelection": "multiple",
      // Animation effect when the data changes - none, auto
      //"animationOnDataChange": "auto",
      // Specifies the animation that is shown on initial display - none, auto
      //"animationOnDisplay": "auto",
      // Specifies the animation duration in milliseconds
      //"animationDuration": "500",
      // The color that is displayed during a data change animation when a node is updated
      //"animationUpdateColor" : "#FFD700",
      // Specifies the starting angle of the sunburst
      //"startAngle": "90",
      // Specifies whether whether the nodes are sorted by size - on, off
      //"sorting": "on"
    },
    // sunburst node properties
    "node" : {
      // Node border color
      //"borderColor": "#000000",
      // Is label displayed? - on, off
      //"labelDisplay": "off",
      // Label horizontal align
      //"labelHalign": "center",
      // Node color on hover
      //"hoverColor": "#FFD700",
      // Selected node color
      //"selectedColor": "#DAA520"
    },
    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default patterns palette
      'patterns' : ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"]
    }
  };
  
})();;
