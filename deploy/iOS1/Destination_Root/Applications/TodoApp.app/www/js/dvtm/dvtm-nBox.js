/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/ArrayItemRenderer.js
 */
(function()
{
  var ArrayItemRenderer = function()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(ArrayItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.nbox.ArrayItemRenderer');

  ArrayItemRenderer.prototype.GetArrayName = function()
  {
    return null;
  };

  ArrayItemRenderer.prototype.ProcessAttributes = function(options, markerNode, context)
  {
    if (adf.mf.api.amx.isValueFalse(markerNode.getAttribute ("rendered")))
    {
      return false;
    }
    if (!markerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    var arrayName = this.GetArrayName();
    if (!arrayName)
      throw new adf.mf.internal.dvt.exception.DvtmException("ArrayName not specified!");
    if (!options [arrayName])
    {
      options [arrayName] = [];
    }
    var array = options [arrayName];

    var result = this.ProcessArrayItem(options, markerNode, context);
    array.push (result);
    return true;
  };

  ArrayItemRenderer.prototype.ProcessArrayItem = function(options, markerNode, context)
  {
    return {};
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxCellRenderer.js
 */
(function() {

  var NBoxCellRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxCellRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxCellRenderer');

  NBoxCellRenderer.prototype.GetArrayName = function()
  {
    return "cells";
  };

  NBoxCellRenderer.prototype.ProcessArrayItem = function(options, cellNode, context)
  {
    NBoxCellRenderer.superclass.ProcessArrayItem.call(this, options, cellNode, context);
    var cell = {};
   
    if (cellNode.getAttribute("row"))
      cell ['row'] = cellNode.getAttribute("row");
    if (cellNode.getAttribute("column"))
      cell ['column'] = cellNode.getAttribute("column");
    if (cellNode.getAttribute("label")) {
      cell ['label'] = cellNode.getAttribute("label");
 
      if (cellNode.getAttribute("labelHalign")) {
       cell ['labelHalign'] = cellNode.getAttribute("labelHalign");
      }
      if (cellNode.getAttribute("labelStyle")) {
        cell ['labelStyle'] = cellNode.getAttribute("labelStyle");
      }
    }
    if (cellNode.getAttribute("showCount"))
      cell ['showCount'] = "on";
    if (cellNode.getAttribute("showMaximize"))
      cell ['showMaximize'] = "on";
    if (cellNode.getAttribute("background"))
      cell ['style'] = "background-color:" + cellNode.getAttribute("background");
    return cell;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxColumnRenderer.js
 */
(function() {

  var NBoxColumnRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxColumnRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxColumnRenderer');

  NBoxColumnRenderer.prototype.GetArrayName = function()
  {
    return "columns";
  };

  NBoxColumnRenderer.prototype.ProcessArrayItem = function(options, columnNode, context)
  {
    var column = {};
   
    if (columnNode.getAttribute("value"))
      column ['id'] = columnNode.getAttribute("value");
    if (columnNode.getAttribute("label")) {
      column ['label'] = columnNode.getAttribute("label");
      if (columnNode.getAttribute("labelHalign")) {
       column ['labelHalign'] = columnNode.getAttribute("labelHalign");
      }
      if (columnNode.getAttribute("labelStyle")) {
        columnNode['labelStyle'] = columnNode.getAttribute("labelStyle");
      }
    }
    return column;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxDefaults.js
 */
(function() {

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.nbox');

  adf.mf.internal.dvt.nbox.DefaultNBoxStyle =
    {
      'styleDefaults':
        {
          // default color palette
          'color': ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
          // default shapes
          'shape': ['circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human'],
          // default indicator color palette
          'indicatorColor': ["#267db3", "#68c182"],
          // default patterns
          'pattern': ['smallChecker', 'smallCrosshatch', 'smallDiagonalLeft', 'smallDiagonalRight', 'smallDiamond', 'smallTriangle', 'largeChecker', 'largeCrosshatch', 'largeDiagonalLeft', 'largeDiagonalRight', 'largeDiamond', 'largeTriangle']
        }
    };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxMarkerRenderer.js
 */
(function() {

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;


  var NBoxMarkerRenderer = function()
  {
  }

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxMarkerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.nbox.NBoxMarkerRenderer');

  NBoxMarkerRenderer.prototype.ProcessAttributes = function(options, amxNode, context)
  {
    if (!amxNode.getAttribute ("rendered"))
        return;
    var facetName = amxNode.getTag().getParent().getAttribute('name');
    var marker = options ['_currentNode'] [facetName];
    if (!marker) {
      marker = {};
      options ['_currentNode'] [facetName] = marker;
    }

    if (amxNode.getAttribute("color"))
      marker.color = amxNode.getAttribute("color");
    if (amxNode.getAttribute("gradientEffect"))
      marker.gradientEffect = amxNode.getAttribute("gradientEffect");
    if (amxNode.getAttribute("height"))
      marker.height = +amxNode.getAttribute("height");
    if (amxNode.getAttribute("opacity"))
      marker.opacity = amxNode.getAttribute("opacity");
    if (amxNode.getAttribute("scaleX"))
      marker.scaleX = +amxNode.getAttribute("scaleX");
    if (amxNode.getAttribute("scaleY"))
      marker.scaleY = +amxNode.getAttribute("scaleY");
    if (amxNode.getAttribute("shape"))
      marker.shape = amxNode.getAttribute("shape");
    if (amxNode.getAttribute("pattern"))
      marker.shape = amxNode.getAttribute("pattern");
    if (amxNode.getAttribute("source"))
      marker.source = adf.mf.api.amx.buildRelativePath(amxNode.getAttribute("source"));
    if (amxNode.getAttribute("width"))
      marker.width = +amxNode.getAttribute("width");
    
    // resolve attribute groups
    var attributeChildren = amxNode.getChildren();
    for (var i = 0; i < attributeChildren.length; i++) {
      var ag = attributeChildren [i];
      var rendered = ag.getAttribute ('rendered');
      if (rendered) {
        AttributeGroupManager.processAttributeGroup(ag, context.amxNode, context);
        var attrGrp = AttributeGroupManager.findGroupById(context.amxNode, AttributeGroupManager._getAttributeGroupId(ag));
        attrGrp.setCustomParam("_facetName", facetName);
      }
    }
    AttributeGroupManager.registerDataItem(context, marker, null);
    
    return true;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxNodeRenderer.js
 */
(function() {

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  var NBoxNodeRenderer = function()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxNodeRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxNodeRenderer');

  NBoxNodeRenderer.prototype.GetArrayName = function()
  {
    return "nodes";
  };

  NBoxNodeRenderer.prototype.ProcessArrayItem = function(options, nodeNode, context)
  {
    var node = {};
    options._currentNode = node;
    if (nodeNode.getAttribute("color"))
      node.color = nodeNode.getAttribute("color");
    if (nodeNode.getAttribute("column"))
      node.column = nodeNode.getAttribute("column");
    node.id = "_" + nodeNode.getId();
    if (nodeNode.getAttribute("label"))
      node.label = nodeNode.getAttribute("label");
      
    if (nodeNode.getAttribute("row"))
      node.row = nodeNode.getAttribute("row");
  
    if (nodeNode.getAttribute("secondaryLabel"))
      node.secondaryLabel = nodeNode.getAttribute("secondaryLabel");
    if (nodeNode.getAttribute("shortDesc"))
      node.shortDesc = nodeNode.getAttribute("shortDesc");
    if (nodeNode.getAttribute("xPercentage"))
      node.xPercentage = nodeNode.getAttribute("xPercentage");
    if (nodeNode.getAttribute("yPercentage"))
      node.yPercentage = nodeNode.getAttribute("yPercentage");

    // resolve attribute groups
    var attributeChildren = nodeNode.getChildren();
    for (var i = 0; i < attributeChildren.length; i++) {
      var ag = attributeChildren [i];
      var rendered = ag.getAttribute ('rendered');
      if (rendered)
        AttributeGroupManager.processAttributeGroup(ag, context.amxNode, context);
    }
    AttributeGroupManager.registerDataItem(context, node, null);

    if (nodeNode.isAttributeDefined('action'))
    {
      node['action'] = nodeNode.getId(); // context['_rowKey'];
    }
    else
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
      actionTags = nodeNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else
      {
        actionTags = nodeNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        node['action'] = nodeNode.getId();  // context['_rowKey'];
      }
    }
    
    return node;
  };


  /**
   * @param facetName name of the facet for which the map of the renderers is requested
   * @return map of the child renderers for given facetName
   */
  NBoxNodeRenderer.prototype.GetChildRenderers = function(facetName)
  {
    if (this._renderers === undefined)
    {
      this._renderers =
        {
          'marker': {'renderer': new adf.mf.internal.dvt.nbox.NBoxMarkerRenderer()}
        };
    }
    return this._renderers;
  };

  /**
   * Returns array of used facet names.
   * 
   * @returns {Array.<string>} supported facet's names
   */
  NBoxNodeRenderer.prototype.GetFacetNames = function()
  {
    return ['icon', 'indicator'];
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxRenderer.js
 */
(function ()
{

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  var NBoxRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxRenderer, 'adf.mf.internal.dvt.DataStampRenderer', 'adf.mf.internal.dvt.nbox.NBoxRenderer');

  /**
   * Returns array of used facet names.
   *
   * @returns {Array.<string>} supported facet's names
   */
  NBoxRenderer.prototype.GetFacetNames = function ()
  {
    return ["rows", "columns", "cells"];
  };

  // render ..................................................................
  NBoxRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.nbox.DefaultNBoxStyle;
  };

  /**
   * Merge default and custom options
   */
  NBoxRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = NBoxRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    // add default colors, shapes... to amxNode
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults && styleDefaults['color'])
    {
      amxNode['_defaultColors'] = styleDefaults['color'];
    }
    if (styleDefaults && styleDefaults['indicatorColor'])
    {
      amxNode['_indicatorColor'] = styleDefaults['indicatorColor'];
    }
    if (styleDefaults && styleDefaults['shape'])
    {
      amxNode['_defaultShapes'] = styleDefaults['shape'];
    }
    if (styleDefaults && styleDefaults['pattern'])
    {
      amxNode['_defaultPatterns'] = styleDefaults['pattern'];
    }
    return options;
  }

  /**
   * @param facetName name of the facet for which the map of the renderers is requested
   * @return map of the child renderers for given facetName
   */
  NBoxRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (this._renderers === undefined)
    {
      this._renderers = 
      {
        'nBoxRow' : 
        {
          'renderer' : new adf.mf.internal.dvt.nbox.NBoxRowRenderer()
        },
        // HACK facet renderrers are registerred as top level renderrers
        // because facet renderrers are ignored in 
        'nBoxColumn' : 
        {
          'renderer' : new adf.mf.internal.dvt.nbox.NBoxColumnRenderer()
        },
        'nBoxCell' : 
        {
          'renderer' : new adf.mf.internal.dvt.nbox.NBoxCellRenderer()
        },
        'nBoxNode' : 
        {
          'renderer' : new adf.mf.internal.dvt.nbox.NBoxNodeRenderer()
        }
      }
    }

    return this._renderers;
  };

  NBoxRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomNBoxStyle';
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  NBoxRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = NBoxRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-nBox-cell'] = [{'path' : '_cell_border', 'type' : BORDER},{'path' : '_cell_backgroundColor', 'type' : StyleProcessor['BACKGROUND']}];
    styleClasses['dvtm-nBox-cell-label'] = [{'path' : '_cell_label', 'type' : StyleProcessor['CSS_TEXT']}/*{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}*/];
    styleClasses['dvtm-nBox-column-label'] = [{'path' : '_column_label', 'type' : StyleProcessor['CSS_TEXT']}/*{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}*/];
    styleClasses['dvtm-nBox-row-label'] = [{'path' : '_row_label', 'type' : StyleProcessor['CSS_TEXT']}/*{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}*/];
    styleClasses['dvtm-nBox-columns-title'] = [{'path' : 'styleDefaults/columnLabelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-nBox-rows-title'] = [{'path' : 'styleDefaults/rowLabelStyle', 'type' : StyleProcessor['CSS_TEXT']}];

    return styleClasses;
  };

  NBoxRenderer.prototype.ProcessStyleClasses = function (node, amxNode)
  {
    NBoxRenderer.superclass.ProcessStyleClasses.call(this, node, amxNode);
    var options = this.GetDataObject(amxNode);

    var cells = options['cells'];
    if (cells)
    {
      for (var i = 0;i < cells.length;i++)
      {
        var cell = cells[i];

        if (options['_cell_backgroundColor'])
        {
          if (!cell['style'])
          {
            cell['style'] = "background-color:" + options['_cell_backgroundColor'];
          } 
        }
        if (options['_cell_border'])
        {
          if (cell['style'])
          {
            cell['style'] = "border:" + options['_cell_border'] + ';' + cell['style'];
          }
          else 
            cell['style'] = "border:" + options['_cell_border'];
        }
        var cellLabel = cell['label'];
        if (cellLabel)
        {
          if (options['_cell_label'])
          {
            if (cellLabel['style'])
            {
              cellLabel['style'] = options['_cell_label'] + ';' + cellLabel['style'];
            }
            else 
              cellLabel['style'] = options['_cell_label'];
          }
          if (options['_cell_label_align'])
          {
            cellLabel['halign'] = options['_cell_label_align'];
          }
        }
      }
    }

    var columns = options['columns'];
    if (columns)
    {
      for (var i = 0;i < columns.length;i++)
      {
        var column = columns[i];
        var columnLabel = column['label'];
        if (columnLabel)
        {
          if (options['_column_label'])
          {
            if (columnLabel['style'])
            {
              columnLabel['style'] = options['_column_label'] + ';' + columnLabel['style'];
            }
            else 
              columnLabel['style'] = options['_column_label'];
          }
        }
      }
    }

    var rows = options['rows'];
    if (rows)
    {
      for (var i = 0;i < rows.length;i++)
      {
        var row = rows[i];
        var rowLabel = row['label'];
        if (rowLabel)
        {
          if (options['_row_label'])
          {
            if (rowLabel['style'])
            {
              rowLabel['style'] = options['_row_label'] + ';' + rowLabel['style'];
            }
            else 
              rowLabel['style'] = options['_row_label'];
          }
        }
      }
    }

    delete options['_cell_backgroundColor'];
    delete options['_cell_border'];
    delete options['_cell_label'];
    delete options['_column_label'];
  };

  /**
   * Initialize generic options for all chart component.
   */
  NBoxRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    NBoxRenderer.superclass.InitComponentOptions.call(this, amxNode, options);

    AttributeGroupManager.reset(amxNode);
  };

  NBoxRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = NBoxRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['columnsTitle'] = {'path' : 'columnsTitle', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['groupBy'] = 
    {
      'path' : 'groupBy', 'type' : PROP_TEXT_ARRAY
    };
    attrs['groupBehavior'] = 
    {
      'path' : 'groupBehavior', 'type' : PROP_TEXT
    };
    attrs['highlightedRowKeys'] = 
    {
      'path' : 'highlightedItems', 'type' : PROP_ROW_KEYS
    };
    attrs['legendDisplay'] = 
    {
      'path' : 'legendDisplay', 'type' : PROP_TEXT
    };
    attrs['maximizedColumn'] = 
    {
      'path' : 'maximizedColumn', 'type' : PROP_TEXT
    };
    attrs['maximizedRow'] = 
    {
      'path' : 'maximizedRow', 'type' : PROP_TEXT
    };
    attrs['nodeSelection'] = 
    {
      'path' : 'selectionMode', 'type' : PROP_TEXT
    };
    attrs['otherThreshold'] = 
    {
      'path' : 'otherThreshold', 'type' : PROP_TEXT
    };
    attrs['rowsTitle'] = 
    {
      'path' : 'rowsTitle', 'type' : AttributeProcessor['TEXT']
    };

    return attrs;
  };

  NBoxRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    var state = NBoxRenderer.superclass.updateChildren.call(this, amxNode, attributeChanges);
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

  NBoxRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = NBoxRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    if (amxNode.isAttributeDefined('selectedRowKeys') && ((typeof options['selection'] == undefined) || (!options['selection'])))
    {
      var _selection = [];
      var selection = AttributeProcessor['ROWKEYARRAY'](amxNode.getAttribute('selectedRowKeys'));
      for (i = 0;i < selection.length;i++)
      {
        var dataForRowKey = amxNode.getChildren(null, selection[i]);
        if ((Object.prototype.toString.call(dataForRowKey) === '[object Array]') && (dataForRowKey.length > 0))
        {
          _selection.push(dataForRowKey[0].getId());
        }
      }
      options['selection'] = codeIDs(_selection);
      amxNode.setAttributeResolvedValue("_selection", _selection);
    }

    return changed;
  };

  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  NBoxRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context)
  {
    AttributeGroupManager.init(context);

    var changed = NBoxRenderer.superclass.ProcessStampedChildren.call(this, options, amxNode, context);

    if (!options["nodes"])
      options["nodes"] = [];
    delete options['_currentNode'];
    var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
    config.setUpdateCategoriesCallback(function (attrGrp, dataItem, valueIndex, exceptionRules)
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
      for (var i = 0; i < rules.length; i++)
      {
        categories.push(attrGrp.getId() + ":" + rules[i]['value']);
      }
    });
    config.addTypeToDefaultPaletteMapping('indicatorColor', 'color');
    config.addTypeToLegendAttributeMapping('indicatorColor', 'color');
    config.setLegendTypeCallback(function (type, legendAttributeName, attrGrp)
    {
      var facetName = attrGrp.getCustomParam("_facetName");
      if (facetName)
      {
        if (type === 'color')
          type = facetName + 'Fill';
        else if (type === 'shape')
          type = facetName + 'Shape';
        else if (type === 'pattern')
          type = facetName + 'Pattern';
      }
      return type;
    });
    AttributeGroupManager.applyAttributeGroups(amxNode, config, context);

    AttributeGroupManager.addDescriptions(amxNode, context, options, 'attributeGroups');

    return changed;
  };

  NBoxRenderer.prototype.CreateComponentCallback = function (amxNode)
  {
    var renderer = this;
    
    var callbackObject = 
    {
      'callback' : function (event, component)
      {
        var type = event['type'];
        if (type === 'selection')
        {
          var selection = event['selection'];
          var rkMapper = function(item)
          {
            return item.getStampKey();
          };
          var ids = decodeIDs (selection);
          var selectedRowKeys = renderer.findAllAmxNodes(amxNode, ids).map(rkMapper);
          var userSelection = amxNode.getAttribute("_selection") || [];
          userSelection = renderer.findAllAmxNodes(amxNode, userSelection).map(rkMapper);
          // filter all removed keys
          var removedKeys = renderer.filterArray(userSelection, function(key)
          {
            return selectedRowKeys.indexOf(key) === -1;
          });

          amxNode.setAttributeResolvedValue("_selection", ids);
          // fire the selectionChange event
          var se = new adf.mf.api.amx.SelectionEvent(removedKeys, selectedRowKeys);
          adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se, null);
        }
        if (type === 'action')
        {
          var commandId = event['commandId'];
          var itemNode = renderer.findAmxNode(amxNode, commandId);

          if (itemNode)
          {
            // fire ActionEvent and then process the 'action' attribute
            var ae = new adf.mf.api.amx.ActionEvent();
            adf.mf.api.amx.processAmxEvent(itemNode, 'action', undefined, undefined, ae,
              function ()
              {
                var action = itemNode.getAttributeExpression("action", true);
                if (action != null)
                {
                  adf.mf.api.amx.doNavigation(action);
                }
              });
          }
        }
      }
    };

    return callbackObject;
  };

  NBoxRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.NBox.newInstance(context, callback, callbackObj, null);
    context.getStage().addChild(instance);
    return instance;
  };

  /**
   * Function renders instance of the component
   */
  NBoxRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {
    var data = null;
    if (this.IsOptionsDirty(amxNode))
    {
      data = this.GetDataObject(amxNode);
      if (adf.mf.environment.profile.dtMode)
      {
        if (!data.rows || data.rows.length < 1)
        {
          data.rows = [{id : "low"},{id : "medium"},{id : "high"}];
        }
        if (!data.columns || data.columns.length < 1)
        {
          data.columns = [{id : "low"},{id : "medium"},{id : "high"}];
        }
        if (!data.nodes || data.nodes.length < 1)
        {
          data.nodes = [{row : "low", column : "low"}];
        }
      }
      if (!data['_resources'])
      {
        data['_resources'] = 
        {
          "overflow_dwn" : 
          {
            "height" : 9, "width" : 34, "src" : "css/images/nBox/alta/overflow_dwn.png"
          },
          "close_dwn" : 
          {
            "height" : 16, "width" : 16, "src" : "css/images/nBox/alta/close_dwn.png"
          },
          "overflow_ena" : 
          {
            "height" : 9, "width" : 34, "src" : "css/images/nBox/alta/overflow_ena.png"
          },
          "close_ena" : 
          {
            "height" : 16, "width" : 16, "src" : "css/images/nBox/alta/close_ena.png"
          },
          "overflow_ovr" : 
          {
            "height" : 9, "width" : 34, "src" : "css/images/nBox/alta/overflow_ovr.png"
          },
          "close_ovr" : 
          {
            "height" : 16, "width" : 16, "src" : "css/images/nBox/alta/close_ovr.png"
          },
          "overflow_dis" : 
          {
            "height" : 9, "width" : 34, "src" : "css/images/nBox/alta/overflow_dis.png"
          },
          "legend_dwn" : 
          {
            "height" : 24, "width" : 24, "src" : "css/images/panelDrawer/panelDrawer-legend-dwn.png"
          },
          "legend_ena" : 
          {
            "height" : 24, "width" : 24, "src" : "css/images/panelDrawer/panelDrawer-legend-ena.png"
          },
          "legend_ovr" : 
          {
            "height" : 24, "width" : 24, "src" : "css/images/panelDrawer/panelDrawer-legend-ovr.png"
          }
        };
      }
      if (!data['attributeGroups'] || !data['attributeGroups'].length)
      {
        data['legendDisplay'] = 'off';
      }
    }
    instance.render(data, width, height);
  };

  // render ..................................................................
  NBoxRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    NBoxRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);
    if (options)
    {
      delete options["cells"];
      delete options["columns"];
      delete options["rows"];
      
      if (!attributeChanges || attributeChanges.hasChanged('value') || descendentChanges)
      {
        delete options["nodes"];
      }
    }

    var selection = amxNode.getAttribute('_selection');
    if (selection !== undefined)
    {
      options['selection'] = codeIDs(selection);
    }

    AttributeGroupManager.reset(amxNode);
  };

  NBoxRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // NBox should not prevent swipe at the moment
    return false;
  };

  // property readers ........................................................
  var PROP_TEXT = function (value)
  {
    if (value !== null && value !== "")
    {
      return '' + value;
    }
    return undefined;
  };
  var PROP_TEXT_ARRAY = function (value)
  {
    if (value !== null && value !== "")
    {
      return ('' + value).split(" ");
    }
    return undefined;
  };
  var PROP_ROW_KEYS = function (value)
  {
    var array = AttributeProcessor['ROWKEYARRAY'](value);
    if (array.length > 0)
    {
      var items = [];
      for (var i = 0;i < array.length;i++)
      {
        items.push(
        {
          'id' : array[i]
        });
      }
      return items;
    }
    return undefined;
  };

  var BORDER = function (node, styleString)
  {
    var nodeStyle = window.getComputedStyle(node, null);
    if (nodeStyle.getPropertyValue('border-top-style').indexOf('none') >= 0)
      return null;
    if (nodeStyle.getPropertyValue('border-top-width').indexOf('0') >= 0)
      return null;
    var border = nodeStyle.getPropertyValue('border-top-width') + " " + nodeStyle.getPropertyValue('border-top-style') + " " + nodeStyle.getPropertyValue('border-top-color');
    return border;
  };
  
  function codeIDs (ids) {
    if (!ids) return ids;
    var result = []
    for (var i = 0; i < ids.length; i++)
      result.push ('_' + ids [i]);
    return result;
  }
  
  function decodeIDs (ids) {
    if (!ids) return ids;
    var result = []
    for (var i = 0; i < ids.length; i++)
      result.push (ids [i].substring (1));
    return result;
  }

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'nBox', NBoxRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    nBox/NBoxRowRenderer.js
 */
(function() {

  var NBoxRowRenderer = function()
  {
  }

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxRowRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxRowRenderer');

  NBoxRowRenderer.prototype.GetArrayName = function()
  {
    return "rows";
  };

  NBoxRowRenderer.prototype.ProcessArrayItem = function(options, rowNode, context)
  {
    var row = {};
   
    if (rowNode.getAttribute("value"))
      row ['id'] = rowNode.getAttribute("value");
    if (rowNode.getAttribute("label")) {
      row ['label'] = rowNode.getAttribute("label");
      if (rowNode.getAttribute("labelHalign")) {
       row ['labelHalign'] = rowNode.getAttribute("labelHalign");
      }
      if (rowNode.getAttribute("labelStyle")) {
        row['labelStyle'] = rowNode.getAttribute("labelStyle");
      }
    }
    return row;
  };
})();
