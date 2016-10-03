/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/BaseChartRenderer.js
 */
(function()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  // create the DVT API namespace
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.api.dvt');

  /*
   * Chart event objects
   */
  /**
   * An event for viewport changes in DVT charts
   * See also the Java API oracle.adfmf.amx.event.ViewportChangeEvent.
   * @param {Object} xMin minimum x coordinate of the viewport
   * @param {Object} xMax maximum x coordinate of the viewport
   * @param {Object} startGroup the first visible group index
   * @param {Object} endGroup the last visible group index
   * @param {Object} yMin minimum y coordinate of the viewport
   * @param {Object} yMax maximum y coordinate of the viewport
   */
  adf.mf.api.dvt.ViewportChangeEvent = function(xMin, xMax, startGroup, endGroup, yMin, yMax)
  {
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
    this[".type"] = "oracle.adfmf.amx.event.ViewportChangeEvent";
  };

  /**
   * Chart Drill event
   * @param {Number} id
   * @param {Number} rowkey
   * @param {String} series
   * @param {String} group
   */
  adf.mf.api.dvt.ChartDrillEvent = function(id, rowkey, series, group)
  {
    this.id = id;
    this.rowkey = rowkey;
    this.series = series;
    this.group = group;
    this[".type"] = "oracle.adfmf.amx.event.ChartDrillEvent";
  };

  /**
   * An event for changes of selection for DVT charts
   * See also the Java API oracle.adfmf.amx.event.ChartSelectionEvent.
   * @param {Object} oldRowKey the rowKey that has just been unselected
   * @param {Array<Object>} selectedRowKeys the array of rowKeys that have just been selected.
   * @param {Object} xMin minimum x coordinate of the viewport
   * @param {Object} xMax maximum x coordinate of the viewport
   * @param {Object} startGroup the first visible group index
   * @param {Object} endGroup the last visible group index
   * @param {Object} yMin minimum y coordinate of the viewport
   * @param {Object} yMax maximum y coordinate of the viewport
   * @param {Object} y2Min minimum y2 coordinate of the viewport
   * @param {Object} y2Max maximum y2 coordinate of the viewport
   */
  adf.mf.api.dvt.ChartSelectionEvent = function(oldRowKey, selectedRowKeys,
                                                xMin, xMax, startGroup, endGroup,
                                                yMin, yMax, y2Min, y2Max)
  {
    this.oldRowKey = oldRowKey;
    this.selectedRowKeys = selectedRowKeys;
    this.xMin = xMin;
    this.xMax = xMax;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
    this.yMin = yMin;
    this.yMax = yMax;
    this.y2Min = y2Min;
    this.y2Max = y2Max;
    this[".type"] = "oracle.adfmf.amx.event.ChartSelectionEvent";
  };

  /**
   * Renderer common for all charts except SparkChart.
   */
  var BaseChartRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseChartRenderer, 'adf.mf.internal.dvt.DataStampRenderer', 'adf.mf.internal.dvt.chart.BaseChartRenderer');

  /**
   * returns the chart type
   */
  BaseChartRenderer.prototype.GetChartType = function ()
  {
    return null;
  };

  BaseChartRenderer.prototype.GetFacetNames = function()
  {
    return [null, 'overview'];
  };

  /**
   * Merge default and custom options
   */
  BaseChartRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = BaseChartRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    var styleDefaults = options['styleDefaults'];

    if (styleDefaults && styleDefaults['colors'])
    {
      amxNode['_defaultColors'] = styleDefaults['colors'];
    }
    else
    {
      amxNode['_defaultColors'] = ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", 
                  "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"];
    }
    if (styleDefaults && styleDefaults['shapes'])
    {
      amxNode['_defaultShapes'] = styleDefaults['shapes'];
    }
    else
    {
      amxNode['_defaultShapes'] =  ['circle', 'square', 'diamond', 'plus', 'triangleUp', 'triangleDown'];
    }
    if (styleDefaults && styleDefaults['patterns'])
    {
      amxNode['_defaultPatterns'] = styleDefaults['patterns'];
    }
    else
    {
      amxNode['_defaultPatterns'] = ['smallDiagonalRight', 'smallChecker', 'smallDiagonalLeft', 'smallTriangle', 'smallCrosshatch', 'smallDiamond',
                 'largeDiagonalRight', 'largeChecker', 'largeDiagonalLeft', 'largeTriangle', 'largeCrosshatch', 'largeDiamond'];
    }
    return options;
  };

  /**
   * @param {String} facetName an optional name of the facet containing the items to be rendered
   * @return object that describes child renderers of the component.
   */
  BaseChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (this._renderers === undefined)
    {
      var FormatRenderer = adf.mf.internal.dvt.common.format.FormatRenderer;
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      var AxisRenderer = adf.mf.internal.dvt.common.axis.AxisRenderer;
      var OverviewRenderer = adf.mf.internal.dvt.common.overview.OverviewRenderer;

      this._renderers =
        {
          'facet':
            {
              'seriesStamp' :
                {
                  'seriesStyle' : { 'renderer' : new adf.mf.internal.dvt.chart.SeriesStyleRenderer(this.GetChartType()) }
                },
              'dataStamp' :
                {
                  'chartDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.ChartDataItemRenderer(this.GetChartType()) }
                },
              'groupStamp':
                {
                  'chartGroup' : { 'renderer' : new adf.mf.internal.dvt.chart.ChartGroupRenderer() }
                }
            },
          'simple' :
            {
              'xAxis' : { 'renderer' : new AxisRenderer('X'), 'order' : 1, 'maxOccurrences' : 1 },
              'yAxis' : { 'renderer' : new AxisRenderer('Y'), 'order' : 1, 'maxOccurrences' : 1 },
              'y2Axis' : { 'renderer' : new AxisRenderer('Y2'), 'order' : 1, 'maxOccurrences' : 1 },
              'xFormat' : { 'renderer' : new FormatRenderer('X'), 'order' : 2, 'maxOccurrences' : 1 },
              'yFormat' : { 'renderer' : new FormatRenderer('Y'), 'order' : 2, 'maxOccurrences' : 1  },
              'y2Format' : { 'renderer' : new FormatRenderer('Y2'), 'order' : 2, 'maxOccurrences' : 1 },
              'zFormat' : { 'renderer' : new FormatRenderer('Z'), 'order' : 2, 'maxOccurrences' : 1 },
              'chartValueFormat' : { 'renderer' : new FormatRenderer('*'), 'order' : 2, 'maxOccurences' : 10 },
              'legend' : { 'renderer' : new LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 },
              'overview' : { 'renderer' : new OverviewRenderer(), 'order' : 3, 'maxOccurences' : 1 }
            }
        }
    }

    if (facetName)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  };

  BaseChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BaseChartRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['title'] = {'path' : 'title/text', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'title/hAlign', 'type' : AttributeProcessor['TEXT']};
    attrs['subtitle'] =  {'path' : 'subtitle/text', 'type' : AttributeProcessor['TEXT']};
    attrs['footnote'] = {'path' : 'footnote/text', 'type' : AttributeProcessor['TEXT']};
    attrs['footnoteHalign'] = {'path' : 'footnote/hAlign', 'type' : AttributeProcessor['TEXT']};
    attrs['timeAxisType'] = {'path' : 'timeAxisType', 'type' : AttributeProcessor['TEXT']};
    attrs['seriesEffect'] = {'path' : 'styleDefaults/seriesEffect', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['animationIndicators'] = {'path' : 'styleDefaults/animationIndicators', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDownColor'] = {'path' : 'styleDefaults/animationDownColor', 'type' : AttributeProcessor['TEXT']};
    attrs['animationUpColor'] = {'path' : 'styleDefaults/animationUpColor', 'type' : AttributeProcessor['TEXT']};
    attrs['dataSelection'] = {'path' : 'selectionMode', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['hideAndShowBehavior'] = {'path' : 'hideAndShowBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['rolloverBehavior'] = {'path' : 'hoverBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['rolloverBehaviorDelay'] = {'path' : 'styleDefaults/hoverBehaviorDelay', 'type' : AttributeProcessor['INTEGER']};
    attrs['dataCursor'] = {'path' : 'dataCursor', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'off'};
    attrs['dataCursorBehavior'] = {'path' : 'dataCursorBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : ''};
    attrs['stack'] = {'path' : 'stack', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['zoomAndScroll'] = {'path' : 'zoomAndScroll', 'type' : AttributeProcessor['TEXT']};
    attrs['dataLabelPosition'] = {'path' : 'styleDefaults/dataLabelPosition', 'type' : AttributeProcessor['TEXT']};
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT']};
    
    // Polar Charts
    attrs['coordinateSystem'] = {'path' : 'coordinateSystem', 'type' : AttributeProcessor['TEXT']};
    // attrs['startAngle'] = {'path' : 'startAngle', 'type' : AttributeProcessor['TEXT']};
    attrs['polarGridShape'] = {'path' : 'polarGridShape', 'type' : AttributeProcessor['TEXT']};

    // Bar Width Customization: these apply only to barChart and comboChart
    attrs['barGapRatio'] = {'path' : 'styleDefaults/barGapRatio', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['maxBarWidth'] = {'path' : 'styleDefaults/maxBarWidth', 'type' : AttributeProcessor['FLOAT']};
    
    attrs['sorting'] = {'path' : 'sorting', 'type' : AttributeProcessor['TEXT']};
    attrs['initialZooming'] = {'path' : 'initialZooming', 'type' : AttributeProcessor['TEXT']};

    // Drill event
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['TEXT']};
    
    attrs['splitDualY'] = {'path' : 'splitDualY', 'type' : AttributeProcessor['TEXT'], 'default' : 'off'};

    return attrs;
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  BaseChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = BaseChartRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-chartPlotArea'] = {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']};

    styleClasses['dvtm-legend'] = [{'path' : 'legend/textStyle', 'type' : StyleProcessor['CSS_TEXT']}, {'path' : 'legend/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'legend/borderColor', 'type' : StyleProcessor['TOP_BORDER_WHEN_WIDTH_GT_0PX']}];
    styleClasses['dvtm-legendTitle'] = {'path' : 'legend/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-legendSectionTitle'] = {'path' : 'legend/sectionTitleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartTitle'] =  {'path' : 'title/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartSubtitle'] =  {'path' : 'subtitle/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartFootnote'] =  {'path' : 'footnote/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartTitleSeparator'] = [{'path' : 'titleSeparator/rendered', 'type' : StyleProcessor['VISIBILITY']}, {'path' : 'titleSeparator/upperColor', 'type' :  StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'titleSeparator/lowerColor', 'type' : StyleProcessor['BORDER_COLOR']}];

    styleClasses['dvtm-chartXAxisTitle'] = {'path' : 'xAxis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartYAxisTitle'] = {'path' : 'yAxis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartY2AxisTitle'] = {'path' : 'y2Axis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartXAxisTickLabel'] = {'path' : 'xAxis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartYAxisTickLabel'] = {'path' : 'yAxis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartY2AxisTickLabel'] = {'path' : 'y2Axis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    if (this.IsNextSkin())
    {
      styleClasses['dvtm-chartTooltipLabel'] = {'path' : 'styleDefaults/tooltipLabelStyle', 'type' : StyleProcessor['CSS_TEXT']};
      styleClasses['dvtm-chartTooltipValue'] = {'path' : 'styleDefaults/tooltipValueStyle', 'type' : StyleProcessor['CSS_TEXT']};
    }
    return styleClasses;
  };

  /**
   * Initialize generic options for all chart component.
   */
  BaseChartRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    BaseChartRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    // improve drag performance
    // options['touchResponse'] = 'touchStart';
    options['titleSeparator'] =
    {
      'rendered' : 'off'
    };

    options["type"] = this.GetChartType();

    options['series'] = [];
    options['groups'] = [];

    // for locales other than en/en-us, set the locale info 
    var locale = adf.mf.locale.getUserLanguage();
    if (locale !== 'en' && locale !== 'en-us')
    // for locales other than en/en-us, set the locale info
    var locale = adf.mf.locale.getUserLocale();
    if (locale && locale !== 'en' && locale !== 'en-us')
    {
      options['_locale'] = locale;
      // get default calendar for region
      var calendar = getLocaleSymbols(locale).getCalendarTypeString();
      // on iOS user can define custom calendar
      var calIndex = locale.indexOf('@calendar=');
      if (calIndex > -1)
      {
        // get user specific calendar
        calendar = locale.substring(calIndex + 10, locale.length);
        locale = locale.substring(0, calIndex);
      }

      if (calendar === 'gregory')
      {
        calendar = 'gregorian';
      }

      var parts = locale.split("-");
      options['_locale'] = parts[0] || null;
      options['_region'] = parts[1] || null;
      options['_calendar'] = calendar || null;
    }

    AttributeGroupManager.reset(amxNode);
    amxNode['_stylesResolved'] = false;
  };

  /**
   * Reset options for all chart component.
   */
  BaseChartRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    BaseChartRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);

    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      if (attributeChanges.hasChanged('value') || descendentChanges)
      {
        options['series'] = [];
        options['groups'] = [];
        AttributeGroupManager.reset(amxNode);
      }
      
      if (options['legend']) {
        delete options['legend']['sections'];
      }

      delete options['valueFormats'];
      delete options['xAxis'];
      delete options['yAxis'];
      delete options['y2Axis'];
     
      var selection = amxNode.getAttribute('_selection');
      if (selection !== undefined)
      {
        options['selection'] = selection;
      }
    }
  };

  BaseChartRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    var state = BaseChartRenderer.superclass.updateChildren.call(this, amxNode, attributeChanges);
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

  BaseChartRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomChartStyle';
  };

  BaseChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;

    if (!this.IsSkyros())
    {
      currentStyle = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_ALTA,
                                        adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1);
      if (!this.IsAlta())
      {
        currentStyle = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_NEXT, currentStyle);
      }
    }
    else
    {
      return adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1;
    }
    return currentStyle;
  };

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context processing context
   */
  BaseChartRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = BaseChartRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);

    // if neither dataSelection, nor zoomAndScroll attributes are specified, drop the _resources array from options
    if (!amxNode.isAttributeDefined('dataSelection') && !amxNode.isAttributeDefined('zoomAndScroll'))
    {
      if (options['_resources'] !== undefined)
      {
        delete options['_resources'];
        changed = true;
      }
    }
    if (amxNode.isAttributeDefined('timeAxisType'))
    {
      var timeAxisType = amxNode.getAttribute('timeAxisType');
      context['timeAxisType'] = timeAxisType;
      this._hasTimeAxis = false;
      if (timeAxisType === 'enabled' || timeAxisType === 'mixedFrequency')
      {
        this._hasTimeAxis = true;
      }
    }

    if (amxNode.isAttributeDefined('selectedRowKeys') && ((typeof options['selection'] == undefined) || (!options['selection'])))
    {
      var _selection = [];
      var selection = AttributeProcessor['ROWKEYARRAY'](amxNode.getAttribute('selectedRowKeys'));
      for (i = 0;i < selection.length;i++)
      {
        var selectionObject = {};
        var dataForRowKey = amxNode.getChildren('dataStamp', selection[i]);
        if ((Object.prototype.toString.call(dataForRowKey) === '[object Array]') && (dataForRowKey.length > 0))
        {
          selectionObject['id'] = dataForRowKey[0].getId();
          _selection.push(selectionObject);
        }
      }
      options['selection'] = _selection;
      amxNode.setAttributeResolvedValue("_selection", _selection);
    }
    return changed;
  };

  /**
   * Check if renderer is running in dtmode. If so then load only dummy data. In other case leave processing on the
   * parent.
   */
  BaseChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {  
    if (adf.mf.environment.profile.dtMode)
    {
      var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(amxNode.getTag().getName());
      var dtModeData = definition.getDTModeData();

      options['groups'] = dtModeData['groups'];
      options['series'] = dtModeData['series'];

      return true;
    }
    else
    {
      return BaseChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    }
  };

  /**
   * @return supported facet's names
   */
  BaseChartRenderer.prototype.GetStampedFacetNames = function ()
  {
    // the processing order is important here
    // 1. we need to prepare structure of chart groups
    // 2. distribute all data items into the series and groups
    // 3. add advanced style for each series
    return ['groupStamp', 'dataStamp', 'seriesStamp'];
  };

  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return {String} stamped child tag name
   */
  BaseChartRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    switch (facetName)
    {
      case 'dataStamp':
        return 'chartDataItem';
        
      case 'seriesStamp':
        return 'seriesStyle';
      
      case 'groupStamp':
        return 'chartGroup';
        
      default:
        return null;
    }
  };

  /**
   * function iterates through collection returned by value attribute and for each item from this collection
   * renders each child in the specified facet.
   */
  BaseChartRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context, facetName)
  {
    AttributeGroupManager.init(context);
      
    var changed = BaseChartRenderer.superclass.ProcessStampedChildren.call(this, options, amxNode, context, facetName);

    var config = this.CreateAttributeGroupConfig();

    AttributeGroupManager.applyAttributeGroups(amxNode, config, context);
    return changed;
  };

  BaseChartRenderer.prototype.ProcessStyleClasses = function (node, amxNode)
  {
    BaseChartRenderer.superclass.ProcessStyleClasses.call(this, node, amxNode);
    
    var options = this.GetDataObject(amxNode);
    if (options['plotArea'] && options['plotArea']['backgroundColor'])
    {
      // remove transparent background color from the payload
      if (options['plotArea']['backgroundColor'] === 'rgba(0, 0, 0, 0)')
      {
        delete options['plotArea'];
      }
    }
  };

  BaseChartRenderer.prototype.CreateAttributeGroupConfig = function ()
  {
    var shape = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.SHAPE;
    
    var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
    
    var updateCallback = null;

    if (!this.PopulateCategories())
    {
      updateCallback = function(attrGrp, dataItem, valueIndex, exceptionRules) {
        // do nothing
      };
    }
    
    if(updateCallback) {
      config.setUpdateCategoriesCallback(updateCallback);
    }
    config.addTypeToItemAttributeMapping(shape, 'markerShape');
    config.addTypeToDefaultPaletteMapping('markerShape', shape);
    config.setOverrideDefaultPalettes(true);
    
    return config;
  };

  BaseChartRenderer.prototype.SelectionHandler = function(amxNode, event, component)
  {
    // selectionChange event support
    var selection = event['selection'];
    if (selection !== undefined)
    {
      var idMapper = function(item)
      {
        return item.getId ? item.getId() : item['id'];
      };

      var rkMapper = function(item)
      {
        return item.getStampKey();
      };

      var selectedRowKeys = this.findAllAmxNodes(amxNode, selection.map(idMapper)).map(rkMapper);

      var userSelection = amxNode.getAttribute("_selection") || [];
      userSelection = this.findAllAmxNodes(amxNode, userSelection.map(idMapper)).map(rkMapper);
      // filter all removed keys
      var removedKeys = this.filterArray(userSelection, function(key)
      {
        return selectedRowKeys.indexOf(key) === -1;
      });

      var se = new adf.mf.api.amx.SelectionEvent(removedKeys, selectedRowKeys);
      adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se);

      var _selection = [];
      if (selection !== undefined && selection !== null)
      {
        for (var i = 0; i < selection.length; i++)
        {
          var eventSelectionObject = selection[i];

          var selectionObject = {};
          selectionObject['id'] = eventSelectionObject.getId();
          selectionObject['group'] = eventSelectionObject.getGroup();
          selectionObject['series'] = eventSelectionObject.getSeries();

          _selection.push(selectionObject);
        }
      }

      amxNode.setAttributeResolvedValue("_selection", _selection);
    }
  };

  BaseChartRenderer.prototype.ViewportChangeHandler = function(amxNode, event, component)
  {
    var xMin, xMax, yMin, yMax;
    var startGroup, endGroup;
    // convert time axis range to Date types
    if (this._hasTimeAxis)
    {
      xMin = new Date(event['xMin']);
      xMax = new Date(event['xMax']);
    }
    else
    {
      xMin = event['xMin'];
      xMax = event['xMax'];
    }
    yMin = event['yMin'];
    yMax = event['yMax'];
    startGroup = event['startGroup'];
    endGroup = event['endGroup'];

    var vce = new adf.mf.api.dvt.ViewportChangeEvent(xMin, xMax, startGroup, endGroup, yMin, yMax);
    adf.mf.api.amx.processAmxEvent(amxNode, 'viewportChange', undefined, undefined, vce);    
  };

  BaseChartRenderer.prototype.ActionHandler = function(amxNode, event, component)
  {
    // action event support
    var actionEvent = event['clientId']; // event is of type DvtActionEvent
    var itemId = actionEvent;
    var notString = typeof event['clientId'] != "string"; // hack, because clientId can be string or object
    if (notString)
    {
      itemId = actionEvent.getId();
    }
    var rowKey = event['commandId']; // no need to use rowkey cache
    if (rowKey !== undefined)
    {
      // get data item's amxNode (assume the rowKey to be unique)
      var item;
      if (notString)
      {
        item = amxNode.getChildren('dataStamp', rowKey)[0];
      }
      else
      {
        var j = 0;
        // need to find right seriesStyle node where we process action attribute
        var seriesStyles;
        do 
        {
          seriesStyles = amxNode.getChildren('seriesStamp', j);
          // there can be more seriesStyle items for one rowKey
          for (var i = 0; i < seriesStyles.length; i++)
          {
            // itemId = seriesId or series name (series)
            if ((seriesStyles[i].getAttribute("seriesId") == itemId) || (seriesStyles[i].getAttribute("series") == itemId))
            {
              if (seriesStyles[i].getAttribute("rendered"))
              { // seriesStyle must be rendered
                item = seriesStyles[i];
                seriesStyles = undefined;
                break;
              }
            }
          }
          j++;
        } 
        while ((seriesStyles != undefined) && (seriesStyles.length > 0));
      }
      if (item !== undefined && item != null)
      {
        // fire ActionEvent and then process the 'action' attribute
        var ae = new adf.mf.api.amx.ActionEvent();
        adf.mf.api.amx.processAmxEvent(item, 'action', undefined, undefined, ae,
          function ()
          {
            var action = item.getAttributeExpression("action", true);
            if (action != null)
            {
              adf.mf.api.amx.doNavigation(action);
            }
          });
      }
    }
  };

  BaseChartRenderer.prototype.DrillHandler = function(amxNode, event, component)
  {
    var id = event['id'];
    var series = event['series'];
    var group = event['group'];

    var rowKey = null;
    if (id)
    {
      var stampedNode = this.findAmxNode(amxNode, id);
      if (stampedNode)
      {
        rowKey = stampedNode.getStampKey();
      }
    }

    var drillEvent = new adf.mf.api.dvt.ChartDrillEvent(id, rowKey, series, group);
    adf.mf.api.amx.processAmxEvent(amxNode, 'drill', undefined, undefined, drillEvent);
  };

  /**
   * Function creates callback for the toolkit component which is common for all chart components
   */
  BaseChartRenderer.prototype.CreateComponentCallback = function(amxNode)
  {
    var that = this;
    // in some cases (mostly live selection/scrollAndZoom) it is important to agregate events
    // to prevent from sending excesive amount of events to backend
    var _postponedEvent = function(id, callback, timeout)
    {
      var _id = '_event.' + id;
      if (that[_id])
      {
        clearTimeout(that[_id]);
        delete that[_id];
      }

      that[_id] = setTimeout(function()
      {
        delete that[_id];
        callback();
      }, timeout || 200);
    };

    var callbackObject =
    {
      'callback' : function (event, component)
      {
        switch (event['type'])
        {
          case 'selection':
            _postponedEvent(event['type'], function()
            {
              that.SelectionHandler(amxNode, event, component);
            });
            break;
          case 'action':
            that.ActionHandler(amxNode, event, component);
            break;
          case 'viewportChange': // zoomAndScroll
            _postponedEvent(event['type'], function()
            {
              that.ViewportChangeHandler(amxNode, event, component);
            });
            break;
          case 'drill':
            that.DrillHandler(amxNode, event, component);
            break;
          default:
            adf.mf.log.Framework.logp(adf.mf.log.level.FINE, that.getTypeName(), "callbackObject.callback", "Unhandled event [" + event['type'] + "].");
        }
      }
    };
    return callbackObject;
  };

  /**
   * Function creates new instance of dvt.Chart
   */
  BaseChartRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.Chart.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  };

  BaseChartRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    var width = dim['width'];
    var height = dim['height'];

    var widthThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_WIDTH / 3);
    var heightThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_HEIGHT / 3);

    if(width - widthThreshold < 0 || height - heightThreshold < 0)
    {
      var ratio;
      if(width - widthThreshold < height - heightThreshold)
      {
        ratio = height / width ;
        width = widthThreshold;
        height = width * ratio;
      }
      else
      {
        ratio = width / height ;
        height = heightThreshold;
        width = height * ratio;
      }
    }

    return {'width' : width, 'height' : height};
  };

  /**
   * sets newly calculated dimensions to the dom node
   */
  BaseChartRenderer.prototype.GetComponentDimensions = function(simpleNode, amxNode)
  {
    var result = BaseChartRenderer.superclass.GetComponentDimensions.call(this, simpleNode, amxNode);

    // if overview is defined, add the overview div for height calculations
    var options = this.GetDataObject(amxNode);
    var overviewId = amxNode.getId() + '_overview';
    var overviewNode = null;

    if (options && options['overview'] && options['overview']['style'] !== undefined)
    {
      overviewNode = simpleNode.querySelector('#' + overviewId);
      if (!overviewNode)
      {
        overviewNode = document.createElement('div');
        overviewNode.setAttribute('id', overviewId);
        overviewNode.setAttribute('style', 'position:absolute; bottom:0px; top:auto; display:block; visibility:hidden; ' + options['overview']['style']);
        simpleNode.appendChild(overviewNode);
      }
      options['overview']['height'] = overviewNode.offsetHeight;
    }

    return result;
  };

  /**
   * Function renders instance of the component
   */
  BaseChartRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = this.GetDataObject(amxNode);
    }
    var dim = this.AdjustStageDimensions({'width' : width, 'height' : height});
    instance.render(data, dim['width'], dim['height']);
  };

  BaseChartRenderer.prototype.GetResourceBundles = function ()
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;

    var bundles = BaseChartRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtChartBundle'));

    return bundles;
  };

  BaseChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // charts should prevent swipe gestures when 'zoomAndScroll' or 'dataCursor' attributes are defined
    if ((amxNode.isAttributeDefined('zoomAndScroll') && amxNode.getAttribute('zoomAndScroll') !== 'off')
      || (amxNode.isAttributeDefined('dataCursor') && amxNode.getAttribute('dataCursor') !== 'off'))
    {
      return true;
    }
    return false;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/AreaChartRenderer.js
 */
(function(){

  var AreaChartRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.AreaChartRenderer');
  
  AreaChartRenderer.prototype.GetChartType = function ()
  {
    return 'area';
  }
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'areaChart', AreaChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/BarChartRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var BarChartRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(BarChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.BarChartRenderer');
 
  BarChartRenderer.prototype.GetChartType = function ()
  {
    return 'bar';
  }

  BarChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BarChartRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['stackLabel'] = {'path' : 'stackLabel', 'type' : AttributeProcessor['TEXT']};
    attrs['stackLabelStyle'] = {'path' : 'styleDefaults/stackLabelStyle', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'barChart', BarChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/BubbleChartRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var BubbleChartRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(BubbleChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.BubbleChartRenderer');
  
  BubbleChartRenderer.prototype.GetChartType = function ()
  {
    return 'bubble';
  };

  BubbleChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BubbleChartRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['zoomDirection'] = {'path' : 'zoomDirection', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };
  
  BubbleChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };
 
  BubbleChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle = BubbleChartRenderer.superclass.GetDefaultStyles.call(this, amxNode);
    // need to override the default style for bubble chart, markers should be on by default
    currentStyle['styleDefaults']['markerDisplayed'] = 'on';
    return currentStyle;
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'bubbleChart', BubbleChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/ChartDataItemRenderer.js
 */
(function ()
{
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var ChartDataItemRenderer = function (chartType)
  {
    this._chartType = chartType;
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ChartDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.ChartDataItemRenderer');

  ChartDataItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ChartDataItemRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['FLOAT']};
    attrs['y'] = {'path' : 'y', 'type' : AttributeProcessor['FLOAT']};
    attrs['z'] = {'path' : 'z', 'type' : AttributeProcessor['FLOAT']};
    attrs['label'] = {'path' : 'label'};
    attrs['labelPosition'] = {'path' : 'labelPosition', 'type' : AttributeProcessor['TEXT']};
    attrs['labelStyle'] = {'path' : 'labelStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['markerSize'] = {'path' : 'markerSize', 'type' : AttributeProcessor['FLOAT']};
    attrs['value'] = {'path' : 'y', 'type' : AttributeProcessor['FLOAT']};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['borderWidth'] = {'path' : 'borderWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['ON_OFF']};
    attrs['pattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    // Range values for area and column chart (ER: 21171401)
    if (this._chartType === 'area' || this._chartType === 'bar')
    {
      attrs['low'] = {'path' : 'low', 'type' : AttributeProcessor['FLOAT']};
      attrs['high'] = {'path' : 'high', 'type' : AttributeProcessor['FLOAT']};
    }

    // on/off
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  ChartDataItemRenderer.prototype.ProcessAttributes = function (options, markerNode, context)
  {
    if (markerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(markerNode.getAttribute('rendered')))
    {
      return true;
    }

    var amxNode = context['amxNode'];

    var dataItem = 
    {
      'id' : markerNode.getId()
    };

    ChartDataItemRenderer.superclass.ProcessAttributes.call(this, dataItem, markerNode, context);

    if (this._hasAction(markerNode))
    {
      dataItem['action'] = context['_rowKey'];
    }

    var seriesId = this._getSeriesId(markerNode);
    var groupId = null;
    var group = null;
    var seriesName = null;

    if (markerNode.isAttributeDefined('groupId'))
    {
      groupId = markerNode.getAttribute('groupId')
    }

    if (markerNode.isAttributeDefined('group'))
    {
      group = markerNode.getAttribute('group');
    }

    if (markerNode.isAttributeDefined('series'))
    {
      seriesName = markerNode.getAttribute('series');
    }

    if (markerNode.isAttributeDefined('timeAxisType'))
    {
      if ('mixedFrequency' === amxNode.getAttribute('timeAxisType'))
      {
        if (dataItem['x'])
          dataItem['x'] = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](dataItem['x']);

        if (group)
          group = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](group);
      }
    }

    var series = adf.mf.internal.dvt.chart.SeriesHelper.getSeriesByIdAndName(amxNode, seriesId, seriesName === null ? "" : seriesName);
    // there is seriesStyle available for these two charts so
    // always mark the series as not displayable in legend
    if (this._chartType === 'bubble' || this._chartType === 'scatter')
    {
      series['displayInLegend'] = 'off';
    }

    var groupIndex = this._addGroup(amxNode, groupId, group, context);
    if (seriesId === null || groupIndex === null)
    {
      series['items'][series['items'].length] = dataItem;
    }
    else
    {
      series['items'][groupIndex] = dataItem;
    }

    // process marker attributes
    var attributeGroupsNodes = markerNode.getChildren();
    for (var i = 0; i < attributeGroupsNodes.length; i++)
    {
      var attrGroupsNode = attributeGroupsNodes[i];

      if (attrGroupsNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(attrGroupsNode.getAttribute('rendered')))
        continue;// skip unrendered nodes
      if (!attrGroupsNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
      }

      AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
    }

    // add the marker to the model
    AttributeGroupManager.registerDataItem(context, dataItem, null);

    return true;
  };

  ChartDataItemRenderer.prototype._hasAction = function (markerNode)
  {
    if (markerNode.isAttributeDefined('action'))
    {
      return true;
    }

    var actionTags;
    // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
    actionTags = markerNode.getTag().getChildren(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
    if (actionTags.length > 0)
      return true;

    actionTags = markerNode.getTag().getChildren(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
    if (actionTags.length > 0)
      return true;

    return false;
  };

  ChartDataItemRenderer.prototype._getSeriesId = function (markerNode)
  {
    var seriesId = null;
    if (markerNode.isAttributeDefined('seriesId'))
    {
      seriesId = markerNode.getAttribute('seriesId');
    }

    if (seriesId === null && markerNode.isAttributeDefined('series'))
    {
      seriesId = markerNode.getAttribute('series');
    }

    return seriesId || null;
  };

  /**
   *  adds a new group to the groups array
   *
   *  if groupId exists, the group is identified by groupId, and a new groups
   *  item is created as: {'id': groupId, name: group}
   *  if groupId is missing, the group is identified by the 'group' parameter
   *  and the groups item is a plain string
   */
  ChartDataItemRenderer.prototype._addGroup = function (amxNode, groupId, group, context)
  {
    if (groupId && context['groupIds'] && context['groupIds'][groupId] != null)
    {
      return context['groupIds'][groupId];
    }

    var options = this.GetDataObject(amxNode);
    var groups = options['groups'];
    var g;

    for (g = 0; g < groups.length; g++)
    {
      if ((groupId && groups[g]['id'] === groupId)
        || groups[g]['name'] === group)
      {
        return g;  
      }
    }

    g = null;
    if (group || groupId)
    {
      var newGroup = {};
  
      if (group)
      {
        newGroup['name'] = group;
      }

      if (groupId)
      {
        newGroup['id'] = groupId;
      }

      g = groups.length;
      groups[groups.length] = newGroup;
    }

    return g;
  };
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/ChartDefaults.js
 */
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.chart');

  adf.mf.internal.dvt.chart.DefaultChartStyle = {};

  adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_NEXT = 
  {
    // set default skin family
    'skin' : 'next'
  }

  adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_ALTA = 
  {
    // set default skin family
    'skin' : 'alta',
    // common chart properties
    // chart title separator properties
    'titleSeparator' : 
    {
      // separator upper color
      'upperColor' : "#74779A", 
      // separator lower color
      'lowerColor' : "#FFFFFF", 
      // should display title separator
      'rendered' : false
    },

    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", 
                  "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default marker shapes
      'shapes' : ['circle', 'square', 'diamond', 'plus', 'triangleUp', 'triangleDown', 'human'], 
      // series effect
      'seriesEffect' : "color"
    }

  };

  adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1 = 
  {
    // set default skin family
    'skin' : 'skyros',
    // common chart properties
    // text to be displayed, if no data is provided
    'emptyText' : null, 
    // animation effect when the data changes
    'animationOnDataChange' : "none", 
    // animation effect when the chart is displayed
    'animationOnDisplay' : "none", 
    // time axis type - disabled / enabled / mixedFrequency
    'timeAxisType' : "disabled",

    // chart legend properties
    'legend' : 
    {
      // legend position none / auto / start / end / top / bottom
      'position' : "auto"
    },

    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#003366", "#CC3300", "#666699", "#006666", "#FF9900", "#993366", 
                  "#99CC33", "#624390", "#669933", "#FFCC33", "#006699", "#EBEA79"], 
      // default series patterns, use only if you want to modify default pattern set
      // 'patterns': ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", 
      //           "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"],
      // default marker shapes
      'shapes' : ['circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human'], 
      // series effect (gradient, color, pattern)
      'seriesEffect' : "gradient", 
      // animation duration in ms
      'animationDuration' : 1000, 
      // animation indicators - all / none
      'animationIndicators' : "all", 
      // animation up color
      'animationUpColor' : "#0099FF", 
      // animation down color
      'animationDownColor' : "#FF3300", 
      // default line width (for line chart)
      'lineWidth' : 3, 
      // default line style (for line chart) - solid / dotted / dashed
      'lineStyle' : "solid", 
      // should markers be displayed (in line and area charts)
      'markerDisplayed' : "off", 
      // default marker color
      'markerColor' : null, 
      // default marker shape
      'markerShape' : "auto", 
      // default marker size
      'markerSize' : 8, 
      // pie feeler color (pie chart only)
      'pieFeelerColor' : "#BAC5D6", 
      // slice label position and text type (pie chart only)
      'sliceLabel' : 
      {
        'position' : "outside", 'textType' : "percent"
      },
      'stockRisingColor': '#6b6f74',
      'stockFallingColor': '#ED6647',
      'stockRangeColor': '#B8B8B8'
    },
    '_resources' :
    {
      'panUp' :       'css/images/chart/pan-up.png',
      'panDown' :     'css/images/chart/pan-down.png',
      'zoomUp' :      'css/images/chart/zoom-up.png',
      'zoomDown' :    'css/images/chart/zoom-down.png',
      'selectUp' :    'css/images/chart/marquee-up.png',
      'selectDown' :  'css/images/chart/marquee-down.png'
    }
  };

  adf.mf.internal.dvt.chart.DefaultSparkChartStyle = {};
  
  adf.mf.internal.dvt.chart.DefaultSparkChartStyle.SKIN_ALTA = {
    'skin' : "alta",
    'color' : "#267db3"
  };

  adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1 = {
    'skin' : "skyros",
    'type' : "line",
    'animationOnDisplay' : "none",
    'animationOnDataChange' : "none",
    'emptyText' : null, 
    'color' : "#666699",
    'firstColor' : null, 
    'lastColor' : null, 
    'highColor' : null, 
    'lowColor' : null,  
    'visualEffects' : "auto",
    'lineWidth' : 1,
    'lineStyle' : "solid",
    'markerSize' : 5,
    'markerShape' : "auto"
  };  
  
  adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS = 
  {
    'type' : "line", 
    'color' : "#00FF00"
  }
})();
/* Copyright (c) 2013, 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/ChartGroupRenderer.js
 */
(function ()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var ChartGroupRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ChartGroupRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.ChartGroupRenderer');

  ChartGroupRenderer.prototype.GetChildRenderers = function (facetName)
  {
    var _renderer = this;
    return { 'chartGroup' : { 'renderer' : _renderer } };
  };

  ChartGroupRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ChartGroupRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['group'] = {'path' : 'name', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['labelStyle'] = {'path' : 'labelStyle', 'type' : AttributeProcessor['TEXT']};
    // on/off
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['TEXT']};
    return attrs;
  };
  
  ChartGroupRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var id = amxNode.getAttribute('groupId');
    var name = amxNode.getAttribute('group');
    
    var groupItem = null;
    options["groups"] = options['groups'] || [];
    
    for (var i = 0, l = options["groups"].length; i < l; i++)
    {
      if (options["groups"][i]["name"] === name)
      {
        groupItem = options["groups"][i];
        break;
      }
    }

    if (groupItem === null)
    {
      groupItem = {};
      options["groups"].push(groupItem);
      
      ChartGroupRenderer.superclass.ProcessAttributes.call(this, groupItem, amxNode, context);
      
      if (id)
      {
        context['groupOrder'] = context['groupOrder'] || 0;
        context['groupIds'] = context['groupIds'] || {};
        context['groupIds'][amxNode.getAttribute('groupId')] = context['groupOrder'];
        context['groupOrder']++;
      }
    }

    context["_items"] = context["_items"] || [];
    
    context["_groupItem"] = groupItem;
  };

  ChartGroupRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var groupItem = context["_groupItem"];
    if (!groupItem)
    {
      return false;
    }

    delete context["_groupItem"];

    return ChartGroupRenderer.superclass.ProcessChildren.call(this, groupItem, amxNode, context);
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/ComboChartRenderer.js
 */
(function(){

  var ComboChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ComboChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.ComboChartRenderer');
  
  ComboChartRenderer.prototype.GetChartType = function ()
  {
    return 'combo';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'comboChart', ComboChartRenderer);
})();
/* Copyright (c) 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/FunnelChartDefaults.js
 */
(function(){

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.funnelChart');
  
  adf.mf.internal.dvt.funnelChart.DefaultFunnelChartStyle = 
  {
    // default style values
    'styleDefaults': {
      'backgroundColor' : 'lightgrey'
    }
  };
})();
/* Copyright (c) 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/FunnelChartRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var FunnelChartRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(FunnelChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.FunnelChartRenderer');
  
  FunnelChartRenderer.prototype.GetChartType = function ()
  {
    return 'funnel';
  };
  
  FunnelChartRenderer.prototype.GetStampedFacetNames = function ()
  {
    return ['dataStamp']; 
  };
 
  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return {String} stamped child tag name
   */
  FunnelChartRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    switch (facetName)
    {
      case 'dataStamp':
        return 'funnelDataItem';
        
      default:
        return null;
    }
  };
  
  FunnelChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return FunnelChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  };
    
  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context processing context
   */
  FunnelChartRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = FunnelChartRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    var attr;
    
    if (amxNode.isAttributeDefined('sliceGaps'))
    {
      attr = amxNode.getAttribute('sliceGaps');
      // convert 'on/off' to newly supported values
      if (attr === 'on')
      {
        attr = '100%';
      }
      else if (attr === 'off')
      {
        attr = '0%';
      }
      options['styleDefaults']['sliceGaps'] = AttributeProcessor['PERCENTAGE'](attr);
    }
    
    return changed;
  };
  
  /**
   * processes the components's child tags
   */
  FunnelChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'facet':
            {
             'dataStamp' :
               {
                 'funnelDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.FunnelDataItemRenderer() }
               }
            },
          'simple' :
            {
              'chartValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('*'), 'order' : 2, 'maxOccurrences' : 1 },
              'legend' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
            }
        }
    }
    
    if(facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  };
  
  FunnelChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = FunnelChartRenderer.superclass.GetAttributesDefinition.call(this);
    // Defines whether the chart is displayed with a 3D effect. Only applies to pie and funnel charts.
    attrs['threeDEffect'] = {'path' : 'styleDefaults/threeDEffect', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  FunnelChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = FunnelChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-funnelDataItem'] = [
      {'path' : 'styleDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']},
      {'path' : 'styleDefaults/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}
    ];
    
    return styleClasses; 
  };

  FunnelChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.funnelChart.DefaultFunnelChartStyle;
  };

  FunnelChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };

  FunnelChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // funnel chart should not prevent swipe/drag gestures
    return false;
  };

  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'funnelChart', FunnelChartRenderer); 
})();
/* Copyright (c) 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/FunnelDataItemRenderer.js
 */
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var FunnelDataItemRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(FunnelDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.FunnelDataItemRenderer');
  
FunnelDataItemRenderer.prototype.ProcessAttributes = function (options, funnelDataItemNode, context)
  {
    var amxNode = context['amxNode'];
    
    var label;
    if (funnelDataItemNode.isAttributeDefined('label'))
    {
      label = funnelDataItemNode.getAttribute('label') + '';  // make sure label is passed as a string
    }

    var val = funnelDataItemNode.getAttribute('value');
    var action;

    
    var dataItem = {};
    
    // process attribute groups, if any
    dataItem['attrGroups'] = [];
    var attributeGroupsNodes = funnelDataItemNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter.hasNext()) {
      var attributeGroupsNode = iter.next();
      if (!attributeGroupsNode.isReadyToRender())
        {
          throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
        }
      AttributeGroupManager.processAttributeGroup(attributeGroupsNode, amxNode, context);
    }
    
    // for funnelChart we use value, not 'y'
    dataItem['value'] =  + val;
  
    if (funnelDataItemNode.isAttributeDefined('action'))
    {
      action = context['_rowKey'];
    }
    else 
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = funnelDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = funnelDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        action = context['_rowKey'];
      }
    }
 
    if (action !== undefined)
    {
      dataItem['action'] = action;
    }
    
    dataItem['id'] = funnelDataItemNode.getId();

    if (funnelDataItemNode.isAttributeDefined('shortDesc'))
    {
      dataItem['shortDesc'] = funnelDataItemNode.getAttribute('shortDesc');
    }
    // data item labels
    if (funnelDataItemNode.isAttributeDefined('label'))
    {
      dataItem['label'] = funnelDataItemNode.getAttribute('label') + '';
    }
    if (funnelDataItemNode.isAttributeDefined('labelStyle'))
    {
      dataItem['labelStyle'] = funnelDataItemNode.getAttribute('labelStyle') + '';
    }    
    if (funnelDataItemNode.isAttributeDefined('labelPosition'))
    {
      dataItem['labelPosition'] = funnelDataItemNode.getAttribute('labelPosition') + '';
    }    
    if (funnelDataItemNode.isAttributeDefined('targetValue'))
    {
      dataItem['targetValue'] = + funnelDataItemNode.getAttribute('targetValue');
    }
    
    // on/off
    if (funnelDataItemNode.isAttributeDefined('drilling'))
    {
      dataItem['drilling'] = funnelDataItemNode.getAttribute('drilling');
    }

    var slice = 
    {
      'id' : label, 'name' : funnelDataItemNode.getAttribute('label') + '', 'items' : [dataItem]
    };

    if (funnelDataItemNode.isAttributeDefined('color'))
    {
      slice['color'] = funnelDataItemNode.getAttribute('color');
    }    
    if (funnelDataItemNode.isAttributeDefined('borderColor'))
    {
      slice['borderColor'] = funnelDataItemNode.getAttribute('borderColor');
    }
    if (funnelDataItemNode.isAttributeDefined('borderWidth'))
    {
      slice['borderWidth'] = funnelDataItemNode.getAttribute('borderWidth');
    }

    this._addSeriesItem(options, slice);

    AttributeGroupManager.registerDataItem(context, dataItem, null);    
    return true;
  }
  
  /**
   * adds a name/data pair to the series.  The item must be of type
   * { name: X, 'data': Y }.
   */
  FunnelDataItemRenderer.prototype._addSeriesItem = function (options, item)
  {
    options['series'].push(item);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/HorizontalBarChartRenderer.js
 */
(function(){

  var HorizontalBarChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(HorizontalBarChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.HorizontalBarChartRenderer');
  
  HorizontalBarChartRenderer.prototype.GetChartType = function ()
  {
    return 'horizontalBar';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'horizontalBarChart', HorizontalBarChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/LineChartRenderer.js
 */
(function(){

  var LineChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(LineChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.LineChartRenderer');
  
  LineChartRenderer.prototype.GetChartType = function ()
  {
    return 'line';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'lineChart', LineChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/PieChartRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var PieChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PieChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.PieChartRenderer');
  
  PieChartRenderer.prototype.GetChartType = function ()
  {
    return 'pie';
  }
  
  PieChartRenderer.prototype.GetStampedFacetNames = function ()
  {
    return ['dataStamp']; 
  }
  
  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return {String} stamped child tag name
   */
  PieChartRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    switch (facetName)
    {
      case 'dataStamp':
        return 'pieDataItem';
        
      default:
        return null;
    }
  }
  
  PieChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return PieChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }
  
  /**
   * processes the components's child tags
   */
  PieChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'facet':
            {
             'dataStamp' :
               {
                 'pieDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.PieDataItemRenderer() }
               }
            },
          'simple' :
            {
              'sliceLabel' : { 'renderer' : new adf.mf.internal.dvt.common.format.SliceLabelFormatRenderer(), 'order' : 1, 'maxOccurrences' : 1 },
              'pieValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('PIE'), 'order' : 2, 'maxOccurrences' : 1 },
              'chartValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('*'), 'order' : 2, 'maxOccurrences' : 1 },
              'legend' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
            }
        }
    }
    
    if(facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  }
  
  PieChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = PieChartRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['sliceLabelPosition'] = {'path' : 'styleDefaults/sliceLabelPosition', 'type' : AttributeProcessor['TEXT']};
    attrs['sliceLabelType'] = {'path' : 'styleDefaults/sliceLabelType', 'type' : AttributeProcessor['TEXT']};
    // attrs['sliceLabelStyle'] = {'path' : 'styleDefaults/sliceLabelStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['threeDEffect'] = {'path' : 'styleDefaults/threeDEffect', 'type' : AttributeProcessor['TEXT']};
    attrs['otherColor'] = {'path' : 'styleDefaults/otherColor', 'type' : AttributeProcessor['TEXT']};
    attrs['sorting'] = {'path' : 'sorting', 'type' : AttributeProcessor['TEXT']};
    attrs['otherThreshold'] = {'path' : 'otherThreshold', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['innerRadius'] = {'path' : 'styleDefaults/pieInnerRadius', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['centerLabel'] = {'path' : 'pieCenterLabel/text', 'type' : AttributeProcessor['TEXT']};
    attrs['selectionEffect'] = {'path' : 'styleDefaults/selectionEffect', 'type' : AttributeProcessor['TEXT']};
    attrs['sliceGaps'] = {'path' : 'styleDefaults/sliceGaps', 'type' : AttributeProcessor['PERCENTAGE']};

    return attrs;
  }
  
  /**
   * We are trying to keep support for old sliceLabel element, as well as sliceLabel in styleDefaults,
   * but we use it only if new version in styleDefaults is not defined!
   * Bug 17198620 - uptake chart json api changes for slicelabel
   * @author midrozd
   */
  PieChartRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = PieChartRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);
    
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults && styleDefaults['sliceLabel'])
    {
      var sliceLabelOptions = styleDefaults['sliceLabel'];
      if (sliceLabelOptions)
      {
        if (styleDefaults['sliceLabelPosition'] === undefined && sliceLabelOptions['position'])
          styleDefaults['sliceLabelPosition'] = sliceLabelOptions['position'];
        if (styleDefaults['sliceLabelType'] === undefined && sliceLabelOptions['textType'])
          styleDefaults['sliceLabelType'] = sliceLabelOptions['textType'];
        if (styleDefaults['sliceLabelStyle'] === undefined && sliceLabelOptions['style'])
          styleDefaults['sliceLabelStyle'] = sliceLabelOptions['style'];

      }
    }
    return options;
  }
  
  PieChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = PieChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-chartPieLabel'] = {'path' : 'styleDefaults/pieLabelStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartSliceLabel'] = {'path' : 'styleDefaults/sliceLabelStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartPieCenterLabel'] = {'path' : 'pieCenterLabel/style', 'type' : StyleProcessor['CSS_TEXT']};
    
    return styleClasses; 
  }
  
  /**
   * Renders instance of the component
   */
  PieChartRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var options = this.GetDataObject(amxNode);
    // if pieCenterLabel has no 'text' property, remove it
    if (options && options['pieCenterLabel'] && !options['pieCenterLabel']['text'])
    {
      delete options['pieCenterLabel'];
    }
    PieChartRenderer.superclass.RenderComponent.call(this, instance, width, height, amxNode);
  }   
  
  
  PieChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // pie chart does not prevent swipe gestures
    return false;
  }
  
  PieChartRenderer.prototype.CreateAttributeGroupConfig = function ()
  {
    var pattern = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.PATTERN;
    
    // pattern is set on the data item
    // there is currently one to one mapping between slices and data items -> set the pattern on corresponding data item
    var callback = function(value, sliceItem) {
      sliceItem['items'][0]['pattern'] = value;
    };
    
    var config = PieChartRenderer.superclass.CreateAttributeGroupConfig.call(this);
    config.addUpdateValueCallback(pattern, callback);
    return config;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'pieChart', PieChartRenderer); 
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/PieDataItemRenderer.js
 */
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  var PieDataItemRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PieDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.PieDataItemRenderer');
  
  PieDataItemRenderer.prototype.ProcessAttributes = function (options, pieDataItemNode, context)
  {
    var sliceId;
    if (pieDataItemNode.isAttributeDefined('sliceId'))
    {
      sliceId = pieDataItemNode.getAttribute('sliceId') + '';  // make sure sliceId is passed as a string
    }
    else 
    {
      sliceId = pieDataItemNode.getAttribute('label') + '';  // make sure sliceId is passed as a string
    }

    var val = pieDataItemNode.getAttribute('value');
    var action;

    if (pieDataItemNode.isAttributeDefined('action'))
    {
      action = context['_rowKey'];
    }
    else 
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = pieDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = pieDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        action = context['_rowKey'];
      }
    }
    var dataItem = {};
    
    dataItem['y'] =  + val;
    
    if (action !== undefined)
    {
      dataItem['action'] = action;
    }
    
    dataItem['id'] = pieDataItemNode.getId();

    if (pieDataItemNode.isAttributeDefined('shortDesc'))
    {
      dataItem['shortDesc'] = pieDataItemNode.getAttribute('shortDesc');
    }
    
    if (pieDataItemNode.isAttributeDefined('pattern'))
    {
      dataItem['pattern'] = pieDataItemNode.getAttribute('pattern');
    }
    
    // on/off
    if (pieDataItemNode.isAttributeDefined('drilling'))
    {
      dataItem['drilling'] = pieDataItemNode.getAttribute('drilling');
    }

    var slice = 
    {
      'id' : sliceId, 'name' : pieDataItemNode.getAttribute('label') + '', 'items' : [dataItem]
    };

    if (pieDataItemNode.isAttributeDefined('explode'))
    {
      var explode = parseFloat(pieDataItemNode.getAttribute('explode'));
      // Bug 18154290 - JSON API pieSliceExplode values are [0..1]
      if (explode > 1)
        explode = explode / 100;
      slice['pieSliceExplode'] = explode;
    }
    if (pieDataItemNode.isAttributeDefined('color'))
    {
      slice['color'] = pieDataItemNode.getAttribute('color');
    }
    if (pieDataItemNode.isAttributeDefined('borderColor'))
    {
      slice['borderColor'] = pieDataItemNode.getAttribute('borderColor');
    }
    if (pieDataItemNode.isAttributeDefined('borderWidth'))
    {
      slice['borderWidth'] = pieDataItemNode.getAttribute('borderWidth');
    }
    if (pieDataItemNode.isAttributeDefined('displayInLegend'))
    {
      slice['displayInLegend'] = pieDataItemNode.getAttribute('displayInLegend');
    }
    // data item labels
    if (pieDataItemNode.isAttributeDefined('sliceLabel'))
    {
      // make sure a number is passed if possible
      var strLabel = pieDataItemNode.getAttribute('sliceLabel');
      var numLabel = parseFloat(strLabel);
      if ((numLabel + '') == strLabel)
      {
        dataItem['label'] = numLabel;
      }
      else
      {
        dataItem['label'] = strLabel;
      }
    }
    this._addSeriesItem(options, slice);

    var amxNode = context['amxNode'];
    
    var attributeGroupsNodes = pieDataItemNode.getChildren();
    var iter3 = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter3.hasNext())
    {
      var attrGroupsNode = iter3.next();

      if (attrGroupsNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(attrGroupsNode.getAttribute('rendered')))
        continue;         // skip unrendered nodes

      if (!attrGroupsNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
      }
      
      AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
    }
    
    AttributeGroupManager.registerDataItem(context, slice, null);
    
    return true;
  }
  
  /**
   * adds a name/data pair to the series.  The item must be of type
   * { name: X, 'data': Y }.
   */
  PieDataItemRenderer.prototype._addSeriesItem = function (options, item)
  {
    options['series'].push(item);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/ScatterChartRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var ScatterChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ScatterChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.ScatterChartRenderer');
  
  ScatterChartRenderer.prototype.GetChartType = function ()
  {
    return 'scatter';
  };
  
  ScatterChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };

  
  ScatterChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle = ScatterChartRenderer.superclass.GetDefaultStyles.call(this, amxNode);
    // need to override the default style for scatter chart, markers should be on by default
    currentStyle['styleDefaults']['markerDisplayed'] = 'on';
    return currentStyle;
  };
    
  ScatterChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ScatterChartRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['TEXT']};
    attrs['zoomDirection'] = {'path' : 'zoomDirection', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'scatterChart', ScatterChartRenderer); 
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/SeriesHelper.js
 */
(function ()
{
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.chart');

  var SeriesHelper = 
  {};

  adf.mf.internal.dvt.chart.SeriesHelper = SeriesHelper;

  /**
   * returns a reference to the series object.  First tries to find
   * the existing series by its id. If not found, creates a new series
   * object with the name and empty data array.
   */
  SeriesHelper.getSeriesByIdAndName = function (amxNode, id, name)
  {
    var options = amxNode.getAttribute(adf.mf.internal.dvt.BaseRenderer.DATA_OBJECT);
    var series = options['series'];
    var groups = options['groups'];
    var hiddenSeries = false;
    // use default id to mark default series
    if (id === null)
    {
      id = "_1";
      hiddenSeries = true;
    }

    // find existing series or create a new one
    for (var s = 0;s < series.length;s++)
    {
      if (series[s]['id'] === id)
      {
        return series[s];
      }
    }

    var ser = { 'id' : id, 'name' : name };
    // default series should not be displayed in legend
    if (hiddenSeries)
    {
      ser['displayInLegend'] = 'off';
      ser['items'] = [];
    }
    else 
    {
      var items = new Array(groups.length);
      for (var i = 0; i < groups.length; i++)
      {
        items[i] = null;
      }
      // create legend with default setting and prepared array of items
      ser['displayInLegend'] = 'on';
      ser['items'] = items;
    }
    // add it to the end of the list of series
    series[series.length] = ser;

    return ser;
  };

})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/SeriesStyleRenderer.js
 */
(function()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var SeriesStyleRenderer = function (chartType)
  {
    this._typeAttrSupported = chartType === 'combo' || chartType === 'stock' || chartType === 'line';
    this._chartType = chartType;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SeriesStyleRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.SeriesStyleRenderer');
   
  SeriesStyleRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SeriesStyleRenderer.superclass.GetAttributesDefinition.call(this);

    // Bug 19423990 - bar chart displays lines not bars
    // this is only case of the Combo Chart so disable this attribute for all other chart types
    if (this._typeAttrSupported)
    {
      attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT'], 'default' : 'line'};
    }
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['pattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['borderWidth'] = {'path' : 'borderWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['ON_OFF']};
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT']};  
    attrs['markerColor'] = {'path' : 'markerColor', 'type' : AttributeProcessor['TEXT']};
    attrs['markerSize'] = {'path' : 'markerSize', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineType'] = {'path' : 'lineType', 'type' : AttributeProcessor['TEXT']};
    attrs['assignedToY2'] = {'path' : 'assignedToY2', 'type' : AttributeProcessor['ON_OFF']};
    // Bug 16757581 - ADD DISPLAYINLEGEND ATTRIBUTE TO PIEDATAITEM AND CHARTSERIESSTYLE
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT']};
    attrs['areaColor'] = {'path' : 'areaColor', 'type' : AttributeProcessor['TEXT']};
    attrs['stackCategory'] = {'path' : 'stackCategory', 'type' : AttributeProcessor['TEXT']};
    // on/off
    attrs['drilling'] = {'path' : 'drilling', 'type' : AttributeProcessor['TEXT']};
    return attrs;
  } 
  /**
   * Update options series with seriesStyleNode data
   */
  SeriesStyleRenderer.prototype.ProcessAttributes = function (options, seriesStyleNode, context)
  {
    // do not apply the style, if 'rendered' is defined and evaluates to false
    if (seriesStyleNode.isAttributeDefined('rendered'))
    {
      if (adf.mf.api.amx.isValueFalse(seriesStyleNode.getAttribute('rendered')))
        return false;
    }
    
    if (!context['__processedSeriesIDs']) 
    {
        context['__processedSeriesIDs'] = {};
    }
    
    // seriesStyle can be matched on seriesId or series, seriesId takes precedence, if present
    var seriesId = null;
    if (seriesStyleNode.isAttributeDefined('seriesId'))
    {
      seriesId = seriesStyleNode.getAttribute('seriesId');
    }
    var seriesName = null;
    if (seriesStyleNode.isAttributeDefined('series'))
    {
      seriesName = seriesStyleNode.getAttribute('series');
    }
    if (!seriesId && !seriesName)
    {
      // no id to match this seriesStyle on, exit
      return false;
    }
    else if (!seriesId)
    {
      seriesId = seriesName;
    }
    
    if (context['__processedSeriesIDs'][seriesId] === true)
    {
      return false;
    }    
    else 
    {
      context['__processedSeriesIDs'][seriesId] = true;
    }

    // find the series item to be updated
    var ser = adf.mf.internal.dvt.chart.SeriesHelper.getSeriesByIdAndName(context['amxNode'], seriesId, seriesName);

    var action;
    if (seriesStyleNode.isAttributeDefined('action') || seriesStyleNode.isAttributeDefined('actionListener'))
    {
      action = context['_rowKey'];
    }
    else 
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = seriesStyleNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = seriesStyleNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        action = context['_rowKey'];
      }
    }    
    
    if (action !== undefined)
    {
      ser['action'] = action;
    }
 
    return SeriesStyleRenderer.superclass.ProcessAttributes.call(this, ser, seriesStyleNode, context);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/SparkChartRenderer.js
 */
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var SparkChartRenderer = function ()
  { }
  
  SparkChartRenderer.DEFAULT_HEIGHT = 100;

  adf.mf.internal.dvt.DvtmObject.createSubclass(SparkChartRenderer, 'adf.mf.internal.dvt.DataStampRenderer', 'adf.mf.internal.dvt.chart.SparkChartRenderer');

  SparkChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SparkChartRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['firstColor'] = {'path' : 'firstColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lastColor'] = {'path' : 'lastColor', 'type' : AttributeProcessor['TEXT']};
    attrs['highColor'] = {'path' : 'highColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lowColor'] = {'path' : 'lowColor', 'type' : AttributeProcessor['TEXT']};
    attrs['baselineScaling'] = {'path' : 'baselineScaling', 'type' : AttributeProcessor['TEXT']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineType'] = {'path' : 'lineType', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  SparkChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = SparkChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['_self'] = {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']};
        
    return styleClasses; 
  }    
    
  /**
   * Initialize options for spark chart component.
   */
  SparkChartRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    SparkChartRenderer.superclass.InitComponentOptions.call(this, amxNode, options);
    
    options['titleSeparator'] =
      {
        'rendered' : 'off'
      };
    
    options['items'] = [];
    options['referenceObjects'] = [];

    amxNode['_stylesResolved'] = false;
  }
  
  SparkChartRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomChartStyle';
  }
  
  SparkChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;
    
    if (!this.IsSkyros())
    {
      currentStyle = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(adf.mf.internal.dvt.chart.DefaultSparkChartStyle.SKIN_ALTA, 
                                        adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1);
    }
    else
    {
      return adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1;
    }
    return currentStyle;
  }
  
  /**
   * Reset options for spark chart component.
   */
  SparkChartRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    SparkChartRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);
    
    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      // if 'value' changed, the dataObject must be recreated from scratch
      if (attributeChanges.hasChanged('value') || descendentChanges)
      {
        options['items'] = [];
      }
      options['referenceObjects'] = [];
    }
  }
  
    /**
   * processes the components's child tags
   */
  SparkChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
  
    if(this._renderers === undefined)
    {
      this._renderers = 
        {
          'facet' : 
            {
              'dataStamp' :
              {
                'sparkDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.SparkDataItemRenderer() }
              }              
            },
          'simple' :
            {
              'referenceObject' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer('spark') }
            }
        }
    }
    
    if(facetName)
    {
      return this._renderers['facet'][facetName];
    }
   
    return this._renderers['simple'];
  }
  
  SparkChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {    
    // if renderer detects design time mode than it skips standard 
    // child processing and only generates dummy data for graph.         
    if (adf.mf.environment.profile.dtMode)
    {
      this._processSparkDummyData(amxNode);
      return true;
    }
    else 
    {
      return SparkChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    }
  }
  
  /**
   * @return supported facet's names
   */
  SparkChartRenderer.prototype.GetStampedFacetNames = function ()
  {
    return ['dataStamp']; 
  }
   
  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives 
   * @return {String} stamped child tag name
   */
  SparkChartRenderer.prototype.GetStampedChildTagName = function(facetName)
  {
    switch (facetName)
    {
      case 'dataStamp':
        return 'sparkDataItem';
        
      default:
        return null;
    }
  };
  
  /**
   * Function creates new instance of DvtSparkChart
   */
  SparkChartRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = dvt.SparkChart.newInstance(context, null, null);
    context.getStage().addChild(instance);
    return instance;
  }  
 
  SparkChartRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  SparkChartRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = SparkChartRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
  /**
   * Function renders instance of the component
   */
  SparkChartRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  { 
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = this.GetDataObject(amxNode);
    }
    instance.render(data, width, height);  
  }
  
  
  /**
   *  Instead of parsing value renderer preparse dummy data for spark graph.
   */
  SparkChartRenderer.prototype._processSparkDummyData = function (amxNode)
  {
    var options = this.GetDataObject(amxNode);
    if (options['items'] == undefined)
    {
      options['items'] = [];
    }

    // if color is not set than renderer sets default graph type.
    // Renderer also ignores el expressions.
    if (options['type'] == undefined || options['type'].indexOf("#{") == 0)
    {
      options['type'] = adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS['type'];
    }

    // if color is not set than renderer sets default color.
    // Renderer also ignores el expressions.
    if (options['color'] == undefined || options['color'].indexOf("#{") == 0)
    {
      options['color'] = adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS['color'];
    }

    // renderer prepares data for graph based with default marker setting.
    var items = options['items'];

    var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(amxNode.getTag().getName());
    var dtModeData = definition.getDTModeData();
      
    var iter = adf.mf.api.amx.createIterator(dtModeData);

    while (iter.hasNext())
    {
      var item = 
      {
        'markerDisplayed' : false,
        'rendered' : 'on',
        'value' : iter.next()
      };

      items.push(item);
    }
  }

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'sparkChart', SparkChartRenderer);
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/SparkDataItemRenderer.js
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SparkDataItemRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SparkDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.SparkDataItemRenderer');
  
  /**
   * parses the sparkDataItem node attributes
   *
   * sparkDataItem has the following attributes
   *
   *   color            - String(Color): support CSS color values
   *   date             - Number: ms since 1970/1/1
   *   floatValue       - Number: the float value
   *   markerDisplayed  - Boolean: should marker display
   *   rendered         - Boolean: should spark data item render
   *   value            - Number: the spark data item value
   *
   */
  SparkDataItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SparkDataItemRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['date'] = {'path' : 'date', 'type' : AttributeProcessor['DATETIME']};
    attrs['floatValue'] = {'path' : 'floatValue', 'type' : AttributeProcessor['FLOAT']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['ON_OFF']};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['ON_OFF']};  
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    /*
     * @TODO: markerShape: default value has been changed from 'square' to 'auto' in DT,
     * but here I better force it to square due to compatibility with old charts! (see stockChart bug)
     */
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT'], 'default' : 'square'};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['markerSize'] = {'path' : 'markerSize', 'type' : AttributeProcessor['INTEGER']};
  
    return attrs;
  }
  
  SparkDataItemRenderer.prototype.ProcessAttributes = function (options, sparkItemNode, context)
  {
    var item = {};
    var changed = SparkDataItemRenderer.superclass.ProcessAttributes.call(this, item, sparkItemNode, context);
    if(changed)
    {
      if(item['date'])
      {
        options['timeAxisType'] = 'enabled';    
      }
    }
      
    var itemsPath = (new adf.mf.internal.dvt.util.JSONPath(options, 'items')); 
    var items = itemsPath.getValue();
    if(items === undefined)
    {
      items = [];
      itemsPath.setValue(items);
    }
    items.push(item);
    
    return changed;
  }
})();
/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/StockChartRenderer.js
 */
(function ()
{

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;

  var StockChartRenderer = function ()
  {}

  adf.mf.internal.dvt.DvtmObject.createSubclass(StockChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.StockChartRenderer');

  StockChartRenderer.prototype.GetChartType = function ()
  {
    return 'stock';
  }

  /**
   * Returns the name of the stamped child tag.
   * @param {String} facetName optional facet name where the stamped child lives
   * @return {String} stamped child tag name
   */
  StockChartRenderer.prototype.GetStampedChildTagName = function (facetName)
  {
    switch (facetName)
    {
      case 'dataStamp':
        return 'stockDataItem';
        
      case 'seriesStamp':
        return 'seriesStyle';
        
      default:
        return null;
    }
  };

  StockChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return StockChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }

  /**
   * processes the components's child tags
   */
  StockChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (this._renderers === undefined)
    {
      var FormatRenderer = adf.mf.internal.dvt.common.format.FormatRenderer;
      var AxisRenderer = adf.mf.internal.dvt.common.axis.AxisRenderer;
      var OverviewRenderer = adf.mf.internal.dvt.common.overview.OverviewRenderer;
      
      this._renderers = 
      {
        'facet' : 
        {
          'dataStamp' : 
          {
            'stockDataItem' : 
            {
              'renderer' : new adf.mf.internal.dvt.chart.StockDataItemRenderer()
            }
          },
          'seriesStamp' :
          {
            'seriesStyle' : { 'renderer' : new adf.mf.internal.dvt.chart.SeriesStyleRenderer(this.GetChartType()) }
          }
        },
        'simple' : 
        {
          'xAxis' : 
          {
            'renderer' : new AxisRenderer('X'), 'order' : 1, 'maxOccurrences' : 1
          },
          'yAxis' : 
          {
            'renderer' : new AxisRenderer('Y'), 'order' : 1, 'maxOccurrences' : 1
          },
          'y2Axis' : 
          {
            'renderer' : new AxisRenderer('Y2'), 'order' : 1, 'maxOccurrences' : 1
          },
          'chartValueFormat' : 
          {
            'renderer' : new FormatRenderer('*'), 'order' : 2, 'maxOccurences' : 10
          },        
          'overview' : 
          {
            'renderer' : new OverviewRenderer(), 'order' : 3, 'maxOccurences' : 1
          }
        }
      }
    }

    if (facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  }

  StockChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StockChartRenderer.superclass.GetAttributesDefinition.call(this);

    // Color when open price is higher than close price
    attrs['fallingColor'] = 
    {
      'path' : 'styleDefaults/stockFallingColor', 'type' : AttributeProcessor['TEXT']
    };
    // Color for the range bar
    attrs['rangeColor'] = 
    {
      'path' : 'styleDefaults/stockRangeColor', 'type' : AttributeProcessor['TEXT']
    };
    // Color when close price is higher than open price
    attrs['risingColor'] = 
    {
      'path' : 'styleDefaults/stockRisingColor', 'type' : AttributeProcessor['TEXT']
    };
    // Color for volume bars
    attrs['volumeColor'] = 
    {
      'path' : 'volumeColor', 'type' : AttributeProcessor['TEXT']
    };

    return attrs;
  }

  StockChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = StockChartRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-stockDataItem'] = [{'path' : 'styleDefaults/backgroundColor', 'type' : StyleProcessor['BACKGROUND'], 'overwrite' : false}];
    styleClasses['dvtm-stockChart-rising'] = [{'path' : 'styleDefaults/stockRisingColor', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}];
    styleClasses['dvtm-stockChart-falling'] = [{'path' : 'styleDefaults/stockFallingColor', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}];
    styleClasses['dvtm-stockChart-range'] = [{'path' : 'styleDefaults/stockRangeColor', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}];

    /* 
     * I had to comment this line, because for volume there are 2 different colors (for rising and falling), so one default color would be undesirable.
     * styleClasses['dvtm-stockChart-volume'] = [{'path' : 'styleDefaults/stockVolumeColor', 'type' : StyleProcessor['COLOR'], 'ignoreEmpty' : true}];
     */

    return styleClasses;
  }
  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @amxNode child amxNode
   */
  StockChartRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = StockChartRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    if (['auto'].indexOf(options['timeAxisType']) > -1) 
    {
      options['timeAxisType'] = 'regular';
    }
    return changed;
  }

  StockChartRenderer.prototype.PopulateCategories = function ()
  {
    return true;
  };

  StockChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // stock chart should not prevent swipe/drag gestures
    return false;
  }

  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'stockChart', StockChartRenderer);
})();
/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */
/*
 *    chart/StockDataItemRenderer.js
 */
(function ()
{

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var StockDataItemRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(StockDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.StockDataItemRenderer');

  StockDataItemRenderer.prototype._hasAction = function (markerNode)
  {
    if (markerNode.isAttributeDefined('action'))
    {
      return true;
    }

    var actionTags;
    // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
    actionTags = markerNode.getTag().getChildren(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
    if (actionTags.length > 0)
      return true;

    actionTags = markerNode.getTag().getChildren(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
    if (actionTags.length > 0)
      return true;

    return false;
  };
  
  StockDataItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StockDataItemRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['borderWidth'] = {'path' : 'borderWidth', 'type' : AttributeProcessor['TEXT']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['close'] = {'path' : 'close', 'type' : AttributeProcessor['FLOAT']};
    attrs['high'] = {'path' : 'high', 'type' : AttributeProcessor['FLOAT']};
    attrs['low'] = {'path' : 'low', 'type' : AttributeProcessor['FLOAT']};
    attrs['open'] = {'path' : 'open', 'type' : AttributeProcessor['FLOAT']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['BOOLEAN']};
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT'], 'default' : 'auto'};
    attrs['markerSize'] = {'path' : 'markerSize', 'type' : AttributeProcessor['TEXT']};
    attrs['pattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['volume'] = {'path' : 'volume', 'type' : AttributeProcessor['FLOAT']};
    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  StockDataItemRenderer.prototype.ProcessAttributes = function (options, markerNode, context)
  {
    if (markerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(markerNode.getAttribute('rendered')))
    {
      return true;
    }

    var amxNode = context['amxNode'];

    var dataItem = 
    {
      'id' : markerNode.getId()
    };

    StockDataItemRenderer.superclass.ProcessAttributes.call(this, dataItem, markerNode, context);
    if (this._hasAction(markerNode))
    {
      dataItem['action'] = context['_rowKey'];
    }

    var seriesId = "Series 1";
    var group = null;
    var groupId = null;
    var seriesName = null;

    if (markerNode.isAttributeDefined('group'))
    {
      group = markerNode.getAttribute('group');
    }

    if (markerNode.isAttributeDefined('groupId'))
    {
      groupId = markerNode.getAttribute('groupId');
    }

    if (markerNode.isAttributeDefined('series'))
    {
      seriesName = markerNode.getAttribute('series');
      seriesId = seriesName;
    }

    var series = adf.mf.internal.dvt.chart.SeriesHelper.getSeriesByIdAndName(amxNode, seriesId, seriesName === null ? "" : seriesName);

    if ('mixedFrequency' === options['timeAxisType'])
    {
      dataItem['x'] = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](dataItem['x']);

      if (group)
      {
        // group should be unique so use it as groupId
        groupId = group;
        group = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](group);
      }
    }

    var groupIndex = this._addGroup(amxNode, groupId, group, context);
    if (groupIndex === null)
    {
      series['items'][series['items'].length] = dataItem;
    }
    else
    {
      series['items'][groupIndex] = dataItem;
    }

    // process marker attributes
    var attributeGroupsNodes = markerNode.getChildren();
    for (var i = 0;i < attributeGroupsNodes.length;i++)
    {
      var attrGroupsNode = attributeGroupsNodes[i];

      if (attrGroupsNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(attrGroupsNode.getAttribute('rendered')))
        continue;// skip unrendered nodes
      if (!attrGroupsNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
      }

      AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
    }

    // add the marker to the model
    AttributeGroupManager.registerDataItem(context, dataItem, null);

    return true;
  };

  /**
   * adds a name/data pair to the series.  The item must be of type
   * { name: X, 'data': Y }.
   */
  StockDataItemRenderer.prototype._addSeriesItem = function (options, item)
  {
    options['series'].push(item);
  };

  /**
   *  adds a new group to the groups array
   *
   *  item is created as group
   */
  StockDataItemRenderer.prototype._addGroup = function (amxNode, groupId, group, context)
  {
    if (groupId && context['groupIds'] && context['groupIds'][groupId] != null)
    {
      return context['groupIds'][groupId];
    }

    var options = this.GetDataObject(amxNode);
    var groups = options['groups'];
    var g;

    for (g = 0;g < groups.length;g++)
    {
      if ((groupId && groups[g]['id'] === groupId) || groups[g]['name'] === group)
      {
        return g;
      }
    }

    g = null;
    if (group || groupId)
    {
      var newGroup = 
      {
        'name' : group
      };

      if (groupId)
      {
        newGroup['id'] = groupId;
      }

      g = groups.length;
      groups[groups.length] = newGroup;
    }

    return g;
  };
})();
