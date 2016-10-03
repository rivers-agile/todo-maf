/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    geoMap/GeographicMapRenderer.js
 */
(function ()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  var GeographicMapRenderer = function ()
  {
    this._configuration = null;
    this._googleApiLoaded = null;
    this._oracleMVApiLoaded = null;

    this._waitingNodes = [];
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(GeographicMapRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.geomap.GeographicMapRenderer');

  GeographicMapRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    if (this._configuration === null)
    {
      this._waitingNodes.push(amxNode);
      amxNode.setAttributeResolvedValue("_configuration", "waiting");

      this._loadConfiguration(
        function (config)
        {
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          var renderer = this;

          this._waitingNodes.forEach(function (node)
          {
            renderer._mapConfigurationToAmxNode(node, config);

            args.setAffectedAttribute(node, "_configuration");
          });

          this._waitingNodes.length = 0;
          adf.mf.api.amx.markNodeForUpdate(args);
        },
        function ()
        {
          // error
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();

          this._waitingNodes.forEach(function (node)
          {
            node.setAttributeResolvedValue("_configuration", "failure");
            args.setAffectedAttribute(node, "_configuration");
          });

          this._waitingNodes.length = 0;
          adf.mf.api.amx.markNodeForUpdate(args);
        });

      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
    }

    this._mapConfigurationToAmxNode(amxNode, this._configuration);

    if (this._configuration["networkStatus"] !== "NotReachable")
    {
      switch (this._configuration["mapProvider"])
      {
        case "oraclemaps":
          if (this._oracleMVApiLoaded === true)
          {
            amxNode.setAttributeResolvedValue("_apiLoaded", "success");

            return false;
          }
          else
          {
            this._loadApi(amxNode, this._loadOracleMVApi);
            return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
          }
          break;
        case "googlemaps":
        default :
          if (this._googleApiLoaded === true)
          {
            amxNode.setAttributeResolvedValue("_apiLoaded", "success");

            return false;
          }
          else
          {
            this._loadApi(amxNode, this._loadGoogleApi);
            return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
          }
      }
    }
    else
    {
      amxNode.setAttributeResolvedValue("_apiLoaded", "failure");

      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
    }

    // let the framework create children
    return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["NONE"];
  };

  GeographicMapRenderer.prototype._mapConfigurationToAmxNode = function(amxNode, config)
  {
    amxNode.setAttributeResolvedValue("_configuration", "success");

    amxNode.setAttributeResolvedValue("_networkAvailable", config["networkStatus"] !== "NotReachable");
    amxNode.setAttributeResolvedValue("_mapProvider", config["mapProvider"]);
    amxNode.setAttributeResolvedValue("_mapViewerUrl", config["mapViewerUrl"]);
    amxNode.setAttributeResolvedValue("_eLocationUrl", config["eLocationUrl"]);
    amxNode.setAttributeResolvedValue("_enableXMLHTTP", adf.mf.api.amx.isValueTrue(config["enableXMLHTTP"]));
    amxNode.setAttributeResolvedValue("_proxyUrl", config["proxyUrl"]);
    amxNode.setAttributeResolvedValue("_baseMap", config["baseMap"]);
    amxNode.setAttributeResolvedValue("_geoMapClientId", config["geoMapClientId"]);
    amxNode.setAttributeResolvedValue("_geoMapKey", config["geoMapKey"]);
    amxNode.setAttributeResolvedValue("_accessibilityEnabled", adf.mf.api.amx.isValueTrue(config["accessibilityEnabled"]))
  };

  var _createApiLoadCallback = function(state)
  {
    return function ()
    {
      var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
      this._waitingNodes.forEach(function (node)
      {
        node.setAttributeResolvedValue("_apiLoaded", state);
        args.setAffectedAttribute(node, "_apiLoaded");
      });
      //
      this._waitingNodes.length = 0;
      //
      adf.mf.api.amx.markNodeForUpdate(args);
    };
  };

  GeographicMapRenderer.prototype._loadApi = function(amxNode, fn)
  {
    amxNode.setAttributeResolvedValue("_apiLoaded", "waiting");
    this._waitingNodes.push(amxNode);

    fn.call(this, _createApiLoadCallback("success"), _createApiLoadCallback("failure"));
  };

  GeographicMapRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    if (attributeChanges.hasChanged("_configuration")
      && amxNode.getAttribute("_configuration") === "success")
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }

    if (attributeChanges.hasChanged("_configuration")
      && amxNode.getAttribute("_configuration") === "reload")
    {
      this._configuration = null;
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }

    if (attributeChanges.hasChanged("_apiLoaded")
      && amxNode.getAttribute("_apiLoaded") === "success")
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  GeographicMapRenderer.prototype._loadConfiguration = function (success, error)
  {
    if (this._isLoading === true)
    {
      return;
    }

    this._isLoading = true;

    var map =
    {
      "#{deviceScope.hardware.networkStatus}" : "networkStatus", // NotReachable
      "#{applicationScope.configuration.mapProvider}" : "mapProvider", //toLowerCase
      "#{applicationScope.configuration.geoMapKey}" : "geoMapKey",
      "#{applicationScope.configuration.geoMapClientId}" : "geoMapClientId",
      "#{applicationScope.configuration.mapViewerUrl}" : "mapViewerUrl",
      "#{applicationScope.configuration.eLocationUrl}" : "eLocationUrl",
      "#{applicationScope.configuration.proxyUrl}" : "proxyUrl",
      "#{applicationScope.configuration.enableXMLHTTP}" : "enableXMLHTTP", // boolean
      "#{applicationScope.configuration.baseMap}" : "baseMap",
      "#{applicationScope.configuration.accessibilityEnabled}" : "accessibilityEnabled" // bolean
    };

    var renderer = this;
    var els = Object.keys(map);

    this._configuration = null;

    if (adf.mf.internal.isJavaAvailable())
    {
      var scb = function (request, response)
      {
        var _configuration = {};
        var _dataChangeListener = function(result)
        {
          var expression = result.getExpression();
          var dcvalue = adf.mf.el.getLocalValue(expression);
          if (dcvalue && dcvalue[".null"] === true)
          {
            dcvalue = null;
          }
          // set new configuration value and continue without notification
          // of the nodes currently rendered
          if (renderer._configuration)
          {
            var name = map[expression];
            if (name === "mapProvider" && dcvalue)
            {
              dcvalue = dcvalue.toLowerCase();
            }
            renderer._configuration[name] = dcvalue;
          }
        };

        response.forEach(function (item)
        {
          var name = map[item.name];
          var value = item.value;
          if (value && value[".null"] === true)
          {
            value = null;
          }

          if (name === "mapProvider" && value)
          {
            value = value.toLowerCase();
          }

          _configuration[name] = value;
          // register listener to listen for configuration changes
          adf.mf.api.addDataChangeListeners(item.name, _dataChangeListener);
        });

        renderer._configuration = _configuration;
        renderer._isLoading = false;

        success.call(renderer, _configuration);
      };

      var ecb = function (request, response)
      {
        renderer._configuration = null;
        error.call(renderer);
        renderer._isLoading = false;
      };

      // ask backend for the fresh configuration
      adf.mf.el.getValue(els, scb, ecb);
    }
    else
    {
      this._configuration = {};
      // try to get configuration from local cache
      els.forEach(function (expression)
      {
        var name = map[expression];
        var value = adf.mf.el.getLocalValue(expression);
        if (value && value[".null"] === true)
        {
          value = null;
        }

        if (name === "mapProvider" && value)
        {
          value = value.toLowerCase();
        }
        renderer._configuration[name] = value;
      });

      this._isLoading = false;
      success.call(this, this._configuration);
    }
  };

  GeographicMapRenderer.prototype._loadGoogleApi = function (success, error)
  {
    if (this._googleApiLoaded === true || this._gapiLoading === true)
    {
      return;
    }

    this._gapiLoading = true;

    var renderer = this;

    GeographicMapRenderer._gapiLoadedCallback = function ()
    {
      renderer._googleApiLoaded = true;
      renderer._gapiLoading = false;
      GeographicMapRenderer._gapiLoadedCallback = null;
      success.call(renderer);
    };

    var errorCallback = function()
    {
      renderer._googleApiLoaded = false;
      renderer._gapiLoading = false;
      GeographicMapRenderer._gapiLoadedCallback = null;
      error.call(renderer);
    };

    var mapApiBaseUrl = "https://maps.googleapis.com/maps/api/js?v=3&sensor=false&callback=adf.mf.internal.dvt.geomap.GeographicMapRenderer._gapiLoadedCallback";
    var url;
    if (this._configuration["geoMapKey"])
    {
      url = mapApiBaseUrl + "&key=" + this._configuration["geoMapKey"];
    }
    else if (this._configuration["geoMapClientId"])
    {
      url = mapApiBaseUrl + "&client=" + this._configuration["geoMapClientId"];
    }
    else
    {
      url = mapApiBaseUrl;
    }
    // set 30s timeout for the google api callback failure
    window.setTimeout(function()
    {
      if (GeographicMapRenderer._gapiLoadedCallback !== null)
      {
        errorCallback();
      }
    }, 30 * 1000);
    // start loading API
    adf.mf.api.resourceFile.loadJsFile(url, true, function ()
    {
      // google provides only async loader so we have nothing to do here
    },
    errorCallback);
  };

  GeographicMapRenderer.prototype._loadOracleMVApi = function (success, error)
  {
    if (this._oracleMVApiLoaded === true || this._omvapiLoading === true)
    {
      return;
    }

    this._omvapiLoading = true;

    var renderer = this;

    var mapViewerUrl = this._configuration["mapViewerUrl"];
    if (mapViewerUrl == null)
    {
      mapViewerUrl = DvtGeographicMap.MAP_VIEWER_URL;
    }

    var url = mapViewerUrl + "/fsmc/jslib/oraclemaps.js";

    var errorCallback = function()
    {
      renderer._oracleMVApiLoaded = false;
      renderer._omvapiLoading = false;
      error.call(renderer);
    };
    // 30 seconds timeout for the file evaluation
    var counter = 30 * 1000 / 100;
    // we have to set timeout to find out when the MV api is fully loaded
    var timer = setInterval(function()
    {
      // verify existence of the MVMapView.version property
      if (window.MVMapView !== undefined && MVMapView.version)
      {
        clearInterval(timer);
        renderer._oracleMVApiLoaded = true;
        renderer._omvapiLoading = false;
        success.call(renderer);
      }
      else if (counter === 0)
      {
        clearInterval(timer);
        errorCallback();
      }

      counter--;
    }, 100);
    // start loading API
    adf.mf.api.resourceFile.loadJsFile(url, true, function ()
    {
    }, errorCallback);
  };

  // create the DVT API namespace
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.api.dvt');

  /*
   * GeoMap event objects
   */

  /**
   * An event for map view property changes in DvtGeographicMap.
   * The event object is passed to the handler specified
   * in the mapBoundsChangeListener attribute.
   * See also the Java API oracle.adfmf.amx.event.MapBoundsChangeEvent.
   * @param {Object} minX minimum x coordinate (longitude) of map view
   * @param {Object} minY minimum y coordinate (latitude) of map view
   * @param {Object} maxX maximum x coordinate (longitude) of map view
   * @param {Object} maxY maximum y coordinate (latitude) of map view
   * @param {Object} centerX x coordinate (longitude) of map center
   * @param {Object} centerY y coordinate (latitude) of map center
   * @param {Number} zoomLevel current zoom level
   */
  adf.mf.api.dvt.MapBoundsChangeEvent = function (minX, minY, maxX, maxY, centerX, centerY, zoomLevel)
  {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.centerX = centerX;
    this.centerY = centerY;
    this.zoomLevel = zoomLevel;
    this[".type"] = "oracle.adfmf.amx.event.MapBoundsChangeEvent";
  };

  /**
   * An event fired when a click/tap, mousedown/up event occurs in DvtGeographicMap.
   * The event object is passed to the handler specified in the mapInputListener attribute.
   * Event properties include x/y coordinates (longitude/latitude) of the location where
   * the click/tap occurred and the event type id -- 'click', 'mousedown', 'mouseup'.
   * See also the Java API oracle.adfmf.amx.event.MapInputEvent.
   * @param {String} type event type id
   * @param {Object} pointX x coordinate (longitude) of the click point
   * @param {Object} pointY y coordinate (latitude) of the click point
   */
  adf.mf.api.dvt.MapInputEvent = function (type, pointX, pointY)
  {
    this.type = type;
    this.pointX = pointX;
    this.pointY = pointY;
    this[".type"] = "oracle.adfmf.amx.event.MapInputEvent";
  };

  GeographicMapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = GeographicMapRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['_self'] =
    {
      'path' : 'background-color', 'type' : adf.mf.internal.dvt.StyleProcessor['BACKGROUND']
    };

    return styleClasses;
  };

  GeographicMapRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    GeographicMapRenderer.superclass.InitComponentOptions.call(this, amxNode, options)

    options['mapOptions'] = {};

    amxNode["_dataObj"] =
    {
      'dataLayers' : [],
      'routes' : [],
      'mapOptions' : {}
    };
  };

  GeographicMapRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = GeographicMapRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['mapType'] = {'path' : 'mapOptions/mapType', 'type' : AttributeProcessor['TEXT']};
    attrs['centerX'] = {'path' : 'mapOptions/centerX', 'type' : AttributeProcessor['TEXT']};
    attrs['centerY'] = {'path' : 'mapOptions/centerY', 'type' : AttributeProcessor['TEXT']};
    attrs['zoomLevel'] = {'path' : 'mapOptions/zoomLevel', 'type' : AttributeProcessor['TEXT']};
    attrs['initialZooming'] = {'path' : 'mapOptions/initialZooming', 'type' : AttributeProcessor['TEXT'], 'default' : 'auto'};
    attrs['animationOnDisplay'] = {'path' : 'mapOptions/animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'mapOptions/shortDesc', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  GeographicMapRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    GeographicMapRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);
    // make a note that this is a refresh phase
    amxNode['_attributeChanges'] = attributeChanges;
    // clear the 'dirty' flag on the options object
    this.SetOptionsDirty(amxNode, false);
    // dataObject will be recreated from scratch
    amxNode["_dataObj"] =
    {
      'dataLayers' : [],
      'routes' : [],
      'mapOptions' : {}
    };

    if (amxNode.getAttribute('__userselection') && descendentChanges)
    {
      var nodes = descendentChanges.getAffectedNodes();
      nodes.forEach(function (node)
      {
        var nodeChanges = descendentChanges.getChanges(node);
        if (nodeChanges && nodeChanges.hasChanged('selectedRowKeys'))
        {
          var userSelection = amxNode.getAttribute('__userselection');
          userSelection[node.getId()] = null;
          amxNode.setAttributeResolvedValue('__userselection', userSelection);
        }
      });
    }
  };

  GeographicMapRenderer.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  GeographicMapRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = GeographicMapRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    // if refreshing existing map, turn off initial zoom and onDisplay animation
    var renderer = this;

    var routeCondition = function (n)
    {
      if (n.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(n.getAttribute('rendered')))
      {
        return false;
      }
      return "route" === n.getTag().getName();
    };

    var markerCondition = function (n)
    {
      if (n.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(n.getAttribute('rendered')))
      {
        return false;
      }
      return "marker" === n.getTag().getName();
    };

    var routePointCreator = function (waypointNode, index)
    {
      var position =
      {
        'id' : waypointNode.getId(),
        'x' : waypointNode.getAttribute('pointX'),
        'y' : waypointNode.getAttribute('pointY'),
        'address' : waypointNode.getAttribute('address'),
        '_rowKey' : '' + (index + 1),
        'displayMarker' : false
      };
      var markerNode = null;
      var list = waypointNode.getChildren();
      for (var i = 0;i < list.length;i++)
      {
        if (markerCondition.call(list, list[i]))
        {
          markerNode = list[i];
          break;
        }
      }
      // not supported on older versions
      // var markerNode = waypointNode.getChildren().find(markerCondition);
      if (markerNode)
      {
        if (markerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(markerNode.getAttribute('rendered')))
        {
          return position;
        }
        position['displayMarker'] = true;
        renderer.processGeographicMapDataItem(null, position, markerNode);
      }

      return position;
    };

    var routeNodes = this.filterArray(amxNode.getChildren(), routeCondition);

    amxNode["_dataObj"]['routes'] = routeNodes.map(function (routeNode)
    {
      var result =
      {
        'id' : routeNode.getId(), 'style' :
        {
          'default' :
          {
            'color' : routeNode.getAttribute("lineColor"), 'width' : routeNode.getAttribute("lineWidth"), 'opacity' : routeNode.getAttribute("lineOpacity")
          }
        },
        'travelMode' : routeNode.getAttribute("travelMode"), 'wayPoints' : routeNode.getRenderedChildren().map(routePointCreator)
      };

      if (renderer._hasAction(routeNode))
      {
        result['action'] = result['id'];
      }
      return result;
    });

    options['mapOptions']['hasMapInputActionListener'] = amxNode.isAttributeDefined('mapInputListener');
    options['mapOptions']['hasMapBoundsChangeActionListener'] = amxNode.isAttributeDefined('mapBoundsChangeListener');

    return changed;
  };

  /**
   * Sets the geographic map properties found on the amxNode
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   * @throws NodeNotReadyToRenderException exception thrown in case that the model is not ready
   */
  GeographicMapRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return this.processGeographicMapPointDataLayerTags(context['amxNode'], amxNode, true);
  };

  GeographicMapRenderer.prototype.CreateComponentCallback = function (amxNode)
  {
    var renderer = this;
    var mapCallbackObj =
    {
      'callback' : function (event, component)
      {
        // fire the selectionChange event
        var type = event.getType();
        var itemNode = null;

        if (type === "selection")
        {
          var userSelection = amxNode.getAttribute('__userselection') || {};
          var dataLayerId = event.getParamValue('dataLayerId');
          if (dataLayerId)
          {
            itemNode = renderer.findAmxNode(amxNode, dataLayerId);

            var selection = event.getSelection();
            selection = selection.map(function(item)
            {
              return item["rowKey"];
            });

            // filter all removed keys
            var removedKeys = renderer.filterArray(userSelection[dataLayerId], function(key)
            {
              return selection.indexOf(key) === -1;
            });

            var se = new adf.mf.api.amx.SelectionEvent(removedKeys, selection);

            userSelection[dataLayerId] = selection;

            amxNode.setAttributeResolvedValue('__userselection', userSelection);

            adf.mf.api.amx.processAmxEvent(itemNode, 'selection', undefined, undefined, se, null);
          }
          else
          {
            var oldSelections = userSelection;
            userSelection = {};
            amxNode.setAttributeResolvedValue('__userselection', userSelection);
            // component is deselecting all rowkeys in all layers so iterate through all previous
            // layers and trigger selection event
            var dataLayerIds = Object.keys(oldSelections);
            dataLayerIds.forEach(function(dlId)
            {
              itemNode = renderer.findAmxNode(amxNode, dlId);
              se = new adf.mf.api.amx.SelectionEvent(oldSelections[dlId], []);

              adf.mf.api.amx.processAmxEvent(itemNode, 'selection', undefined, undefined, se, null);
            });
          }
        }
        else if (type === "action")
        {
          itemNode = renderer.findAmxNode(amxNode, event.getClientId());

          if (itemNode)
          {
            // marker node found, fire event and handle action
            var point = event.getParamValue('pointXY');
            if (point)
            {
              var markerDiv = document.getElementById(itemNode.getId());
              if (!markerDiv)
              {
                var canvasId = amxNode.getId() + '_canvas';
                var canvas = document.getElementById(canvasId);
                markerDiv = DOMUtils.createDIV();
                DOMUtils.writeIDAttribute(markerDiv, itemNode.getId());
                DOMUtils.writeStyleAttribute(markerDiv, "position: absolute; width:1px; height:1px;");
                canvas.appendChild(markerDiv);
              }
              markerDiv.style.cssText += 'top:' + (point.y - 2) + 'px;' + 'left:' + (point.x + 1) + 'px;';
            }

            var actionEvent = new adf.mf.api.amx.ActionEvent();
            var actionType = event.getParamValue('actionType') || 'click';
            var callback = function() {/*default callback without any action*/};

            // toolkit returns action types click and tapHold. AMX layer
            // however supports action and tapHold events so it is necessary to
            // translate click to action.
            if (actionType === 'click')
            {
              actionType = 'action';
              // in case and only in case of action event we want to perform navigation
              callback = function()
              {
                // action callback which is able to invoke navigation
                var action = itemNode.getAttributeExpression("action", true);
                if (action != null)
                {
                  adf.mf.api.amx.doNavigation(action);
                }
              };
            }

            adf.mf.api.amx.processAmxEvent(itemNode, actionType, undefined, undefined, actionEvent, callback);
          }
        }
        else if (type === "mapinput" && amxNode.isAttributeDefined('mapInputListener'))
        {
          var mie = new adf.mf.api.dvt.MapInputEvent(event.getEventId(), event.getPointX(), event.getPointY());
          adf.mf.api.amx.processAmxEvent(amxNode, 'mapInput', undefined, undefined, mie);
        }
        else if (type === 'mapboundschange' && amxNode.isAttributeDefined('mapBoundsChangeListener'))
        {
          var mbce = new adf.mf.api.dvt.MapBoundsChangeEvent(event.getMinX(), event.getMinY(), event.getMaxX(), event.getMaxY(), event.getCenterX(), event.getCenterY(), event.getZoomLevel());
          adf.mf.api.amx.processAmxEvent(amxNode, 'mapBoundsChange', undefined, undefined, mbce);
        }
      }
    };

    return mapCallbackObj;
  };

  GeographicMapRenderer.prototype.CreateRenderingContext = function (root, stageId)
  {
    return null;
  };

  GeographicMapRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    return adf.mf.internal.dvt.geomap.DvtGeographicMap.newInstance(callback, callbackObj, this.GetDataObject(amxNode));
  };

  /**
   * sets up chart's outer div element
   *
   * @param amxNode
   */
  GeographicMapRenderer.prototype.SetupComponent = function (amxNode)
  {
    var contentDiv = GeographicMapRenderer.superclass.SetupComponent.call(this, amxNode);

    var canvasDiv = DOMUtils.createDIV();
    var id = amxNode.getId() + '_canvas';
    DOMUtils.writeIDAttribute(canvasDiv, id);
    DOMUtils.writeStyleAttribute(canvasDiv, 'width: 100%; height: 100%;');
    contentDiv.appendChild(canvasDiv);

    if (adf.mf.environment.profile.dtMode)
    {
      var readonly = document.createElement("div");
      readonly.className = "dvtm-readonly";
      contentDiv.appendChild(readonly);
    }
    return contentDiv;
  };

  GeographicMapRenderer.prototype._checkAndRenderWarning = function(amxNode, name)
  {
    switch(amxNode.getAttribute(name))
    {
      case "success":
        return true;
      case "failure":
        this._renderReloadPage(amxNode, amxNode.getId() + '_canvas');
        return false;
      case "waiting":
        default:
        this._renderPlaceholder(amxNode.getId() + '_canvas');
        return false;
    }
  };

  GeographicMapRenderer.prototype.postDisplay = function (rootElement, amxNode)
  {
    if (this.IsAncestor(document.body, rootElement))
    {
      this.GetComponentDimensions(rootElement, amxNode);
    }

    // render reload button when api is not available
    if (!this._checkAndRenderWarning(amxNode, "_configuration"))
    {
      return;
    }
    // render reload button when network is not available
    if (amxNode.getAttribute("_networkAvailable") === false)
    {
      this._renderReloadPage(amxNode, amxNode.getId() + '_canvas');
      return;
    }

    if (!this._checkAndRenderWarning(amxNode, "_apiLoaded"))
    {
      return;
    }

    if (this.__isReadyToRender(amxNode) === false)
    {
      this._renderPlaceholder(amxNode.getId() + '_canvas');
      return;
    }

    GeographicMapRenderer.superclass.postDisplay.call(this, rootElement, amxNode);
  };

  GeographicMapRenderer.prototype.refresh = function(amxNode, attributeChanges, descendentChanges)
  {
    if (attributeChanges.hasChanged("inlineStyle"))
    {
      var element = document.getElementById(amxNode.getId());
      element.setAttribute("style", amxNode.getAttribute("inlineStyle"));
    }
    // render reload button when network is not available
    if (amxNode.getAttribute("_networkAvailable") === false)
    {
      this._renderReloadPage(amxNode, amxNode.getId() + '_canvas');
      return;
    }

    if (!this._checkAndRenderWarning(amxNode, "_apiLoaded"))
    {
      return;
    }

    if (this.__isReadyToRender(amxNode) === false)
    {
      return;
    }

    GeographicMapRenderer.superclass.refresh.call(this, amxNode, attributeChanges, descendentChanges);
  };

  GeographicMapRenderer.prototype.__isReadyToRender = function(amxNode)
  {
    var ready = true;
    amxNode.visitChildren(new adf.mf.api.amx.VisitContext(), function (visitContext, anode)
    {
      if (anode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(anode.getAttribute('rendered')))
      {
        return adf.mf.api.amx.VisitResult['REJECT'];
      }

      if (anode.getTag().getName() === "pointDataLayer")
      {
        if (anode.isAttributeDefined("value"))
        {
          var items = anode.getAttribute("value");
          if (items === undefined)
          {
            ready = false;
            return adf.mf.api.amx.VisitResult['COMPLETE'];
          }

          if (items && items.treeNodeBindings)
          {
            var iter = adf.mf.api.amx.createIterator(items);
            if (iter.getTotalCount() > iter.getAvailableCount())
            {
              ready = false;
              return adf.mf.api.amx.VisitResult['COMPLETE'];
            }
          }
        }

        return adf.mf.api.amx.VisitResult['REJECT'];
      }
      return adf.mf.api.amx.VisitResult['ACCEPT'];
    });

    return ready;
  };

  GeographicMapRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {
    var mapCanvas = document.getElementById(amxNode.getId() + '_canvas');
    // everything is ok and we can rendere the map itself
    instance.setMapProvider(amxNode.getAttribute("_mapProvider"));
    instance.setMapViewerUrl(amxNode.getAttribute("_mapViewerUrl"));
    instance.setELocationUrl(amxNode.getAttribute("_eLocationUrl"));
    instance.setProxyUrl(amxNode.getAttribute("_proxyUrl"));
    instance.enableXMLHTTP(amxNode.getAttribute("_enableXMLHTTP"));
    instance.setBaseMap(amxNode.getAttribute("_baseMap"));
    instance.setScreenReaderMode(amxNode.getAttribute("_accessibilityEnabled"));

    var options = this.GetDataObject(amxNode);

    // set options to project any changes to the map instance
    instance.setOptions(options);
    instance.render(mapCanvas, amxNode['_dataObj'], width, height);
  };

  GeographicMapRenderer.prototype._renderPlaceholder = function(canvasId)
  {
    var mapCanvas = document.getElementById(canvasId);
    adf.mf.api.amx.emptyHtmlElement(mapCanvas);

    var placeholder = document.createElement("div");
    placeholder.id = canvasId + "_placeholder";
    placeholder.className = "dvtm-component-placeholder amx-deferred-loading";

    var msgLoading = adf.mf.resource.getInfoString("AMXInfoBundle", "MSG_LOADING");
    placeholder.setAttribute("aria-label", msgLoading);

    mapCanvas.appendChild(placeholder);
  };

  GeographicMapRenderer.prototype._renderReloadPage = function(amxNode, canvasId)
  {
    var mapCanvas = document.getElementById(canvasId);
    adf.mf.api.amx.emptyHtmlElement(mapCanvas);

    var reloadDiv = document.createElement("div");
    reloadDiv.classList.add("dvtm-geographicMap-loadPage");

    var innerDiv = document.createElement("div");

    var label = document.createElement("div");
    label.appendChild(document.createTextNode(adf.mf.resource.getInfoString("AMXInfoBundle","dvtm_geographicMap_FAILED_LOAD_API")));
    innerDiv.appendChild(label);

    var button = document.createElement("div");
    button.setAttribute("tabindex", "0");
    label = document.createElement("label");
    label.classList.add("amx-commandButton-label");
    label.appendChild(document.createTextNode(adf.mf.resource.getInfoString("AMXInfoBundle","dvtm_geographicMap_RELOAD_BUTTON_LABEL")));
    button.appendChild(label);

    // Adding WAI-ARIA Attribute to the markup for the role attribute
    button.setAttribute("role", "button");
    button.classList.add("amx-node", "amx-commandButton");

    adf.mf.api.amx.addBubbleEventListener(button, 'tap', function (event)
    {
      var args = new adf.mf.api.amx.AmxNodeUpdateArguments();

      amxNode.setAttributeResolvedValue("_configuration", "reload");
      args.setAffectedAttribute(amxNode, "_configuration");

      adf.mf.api.amx.emptyHtmlElement(document.getElementById(canvasId));
      adf.mf.api.amx.markNodeForUpdate(args);
    });

    innerDiv.appendChild(button);

    reloadDiv.appendChild(innerDiv);

    mapCanvas.appendChild(reloadDiv);
    mapCanvas = null;
  };

  /**
   * Process the point data layer tag
   *
   * @throws NodeNotReadyToRenderException exception thrown in case that the model is not ready
   */
  GeographicMapRenderer.prototype.processGeographicMapPointDataLayerTags = function (amxNode, node, setMapProp)
  {
    var data = amxNode["_dataObj"];

    var children = node.getChildren();
    var iter = adf.mf.api.amx.createIterator(children);

    while (iter.hasNext())
    {
      var pointDataLayerNode = iter.next();

      if (pointDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(pointDataLayerNode.getAttribute('rendered')))
        continue;

      // accept only dvtm:pointDataLayer nodes
      if (pointDataLayerNode.getTag().getName() !== 'pointDataLayer')
      {
        continue;
      }

      // if the model is not ready don't render the map
      if (!pointDataLayerNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
      }

      var dataLayer =
      {
      };

      var idx = iter.getRowKey();
      dataLayer['idx'] = idx;

      this.processSingleGeographicMapPointDataLayerTag(amxNode, pointDataLayerNode, dataLayer);

      data['dataLayers'].push(dataLayer);
    }
  };

  GeographicMapRenderer.prototype.processSingleGeographicMapPointDataLayerTag = function (amxNode, pointDataLayerNode, dataLayer)
  {
    var attr;

    attr = pointDataLayerNode.getAttribute('id');
    if (attr)
      dataLayer['id'] = attr;

    attr = pointDataLayerNode.getAttribute('animationOnDuration');
    if (attr)
      dataLayer['animationOnDuration'] = attr;

    attr = pointDataLayerNode.getAttribute('animationOnDataChange');
    if (attr)
      dataLayer['animationOnDataChange'] = attr;

    var strSelections = "";
    var k;
    var userSelection = amxNode.getAttribute('__userselection');
    userSelection = userSelection || {};
    var selection = userSelection[pointDataLayerNode.getId()];

    if (selection)
    {
      for (k = 0;k < selection.length;k++)
      {
        if (k)
          strSelections += " ";
        strSelections += selection[k];
      }
      dataLayer['selectedRowKeys'] = strSelections;
    }
    else
    {
      attr = pointDataLayerNode.getAttribute('selectedRowKeys');
      if (attr)
      {
        // geomap renderer currently expects selected rowkeys as a space-separated string
        // TODO: fix this when the renderer accepts an array
        var arSelections = AttributeProcessor['ROWKEYARRAY'](attr);
        if (arSelections && arSelections.length > 0)
        {
          for (k = 0;k < arSelections.length;k++)
          {
            if (k)
              strSelections += " ";
            strSelections += arSelections[k];
          }
        }
        dataLayer['selectedRowKeys'] = strSelections;

        userSelection[pointDataLayerNode.getId()] = arSelections;
        amxNode.setAttributeResolvedValue('__userselection', userSelection);
      }
    }
    attr = pointDataLayerNode.getAttribute('dataSelection');
    if (attr)
      dataLayer['dataSelection'] = attr;

    attr = pointDataLayerNode.getAttribute('emptyText');
    if (attr)
      dataLayer['emptyText'] = attr;

    this.processGeographicMapPointLocationTag(amxNode, dataLayer, pointDataLayerNode);
  };

  GeographicMapRenderer.prototype.processGeographicMapPointLocationTag = function (amxNode, dataLayer, pointDataLayerNode)
  {
    dataLayer['data'] = [];
    var varName = pointDataLayerNode.getAttribute('var');
    var value = pointDataLayerNode.getAttribute('value');

    if (adf.mf.environment.profile.dtMode && value && value.replace(/\s+/g, '').indexOf('#{') >  - 1)
    {
      return;
    }

    if (value)
    {
      // collection is available so iterate through data and process each pointLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext())
      {
        var stamp = iter.next();
        var children = pointDataLayerNode.getChildren(null, iter.getRowKey());
        // set context variable for child tag processing
        adf.mf.el.addVariable(varName, stamp);
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext())
        {
          var pointLocNode = iter2.next();
          var rowKey = iter.getRowKey();
          // process each location node
          this._processGeographicMapPointLocation(amxNode, dataLayer, pointLocNode, rowKey);
        }
        adf.mf.el.removeVariable(varName);
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = pointDataLayerNode.getChildren();
      var childTagIterator = adf.mf.api.amx.createIterator(tagChildren);

      while (childTagIterator.hasNext())
      {
        var tagPointLocNode = childTagIterator.next();
        var tagRowKey = "" + (childTagIterator.getRowKey() + 1);
        // process each location node
        this._processGeographicMapPointLocation(amxNode, dataLayer, tagPointLocNode, tagRowKey);
      }
    }
  };

  GeographicMapRenderer.prototype._processGeographicMapPointLocation = function (amxNode, dataLayer, pointLocNode, rowKey)
  {
    // accept dvtm:pointLocation only
    if (pointLocNode.getTag().getName() !== 'pointLocation')
    {
      return;
    }

    if (pointLocNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(pointLocNode.getAttribute('rendered')))
    {
      return;
    }

    if (!pointLocNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }

    var data =
    {
    };

    if (pointLocNode.isAttributeDefined('type'))
    {
      data['type'] = pointLocNode.getAttribute('type');
    }
    if (pointLocNode.isAttributeDefined('pointX') && pointLocNode.isAttributeDefined('pointY'))
    {
      data['x'] = pointLocNode.getAttribute('pointX');
      data['y'] = pointLocNode.getAttribute('pointY');
    }
    else if (pointLocNode.isAttributeDefined('address'))
    {
      data['address'] = pointLocNode.getAttribute('address');
    }

    if (pointLocNode.isAttributeDefined('id'))
    {
      data['id'] = pointLocNode.getAttribute('id');
    }

    var markerNodes = pointLocNode.getChildren();

    if (markerNodes.length > 0 && markerNodes[0].getTag().getName() === 'marker')
    {
      data['_rowKey'] = rowKey;
      this.processGeographicMapDataItem(amxNode, data, markerNodes[0]);
    }

    dataLayer['data'].push(data);
  };

  GeographicMapRenderer.prototype.processGeographicMapDataItem = function (amxNode, data, dataNode)
  {
    // First check if this data item should be rendered at all
    if (dataNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataNode.getAttribute('rendered')))
      return;

    if (!dataNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }

    if (dataNode.isAttributeDefined('source'))
      data['source'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('source'));

    if (dataNode.isAttributeDefined('sourceHover'))
      data['sourceHover'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHover'));

    if (dataNode.isAttributeDefined('sourceSelected'))
      data['sourceSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceSelected'));

    if (dataNode.isAttributeDefined('sourceHoverSelected'))
      data['sourceHoverSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHoverSelected'));

    if (dataNode.isAttributeDefined('shortDesc'))
      data['shortDesc'] = dataNode.getAttribute('shortDesc');

    if (dataNode.getAttribute('labelDisplay') === "on")
    {
      if (dataNode.isAttributeDefined('value'))
        data['label'] = dataNode.getAttribute('value');

      if (dataNode.isAttributeDefined('labelPosition'))
        data['labelPosition'] = dataNode.getAttribute('labelPosition');

      if (dataNode.isAttributeDefined('labelStyle'))
        data['labelStyle'] = dataNode.getAttribute('labelStyle');
    }

    if (dataNode.isAttributeDefined('width'))
      data['width'] = +dataNode.getAttribute('width');

    if (dataNode.isAttributeDefined('height'))
      data['height'] = +dataNode.getAttribute('height');

    if (dataNode.isAttributeDefined('scaleX'))
      data['scaleX'] = +dataNode.getAttribute('scaleX');

    if (dataNode.isAttributeDefined('scaleY'))
      data['scaleY'] = +dataNode.getAttribute('scaleY');

    if (dataNode.isAttributeDefined('rotation'))
      data['rotation'] = +dataNode.getAttribute('rotation');

    if (dataNode.isAttributeDefined('opacity'))
      data['opacity'] = +dataNode.getAttribute('opacity');

    data['clientId'] = dataNode.getId();

    if (this._hasAction(dataNode))
    {
      data['action'] = data['_rowKey'];
    }
    else
    {
      data['action'] = null;
    }
  };

  GeographicMapRenderer.prototype._hasAction = function (amxNode)
  {
    if (amxNode.isAttributeDefined('action'))
    {
      return true;
    }
    else
    {
      var actionTags;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
      actionTags = amxNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        return true;

      actionTags = amxNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
      if (actionTags.length > 0)
        return true;

      actionTags = amxNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'actionListener');
      if (actionTags.length > 0)
        return true;

      return false;
    }
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'geographicMap', GeographicMapRenderer);
})();
/* Copyright (c) 2013, 2015 Oracle and/or its affiliates. All rights reserved. */
/*
 *    geoMap/GeographicMapToolkit.js
 */
(function ()
{
  var DvtGeographicMap = function (callback, callbackObj)
  {
    this.Init(callback, callbackObj);
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtGeographicMap, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.geomap.DvtGeographicMap');

  /** @private */
  // TODO change to supported map providers
  DvtGeographicMap.MAP_PROVIDER_ORACLE = 'oraclemaps';
  DvtGeographicMap.MAP_PROVIDER_GOOGLE = 'googlemaps';
  DvtGeographicMap.MAP_VIEWER_URL = 'http://elocation.oracle.com/mapviewer';
  DvtGeographicMap.ELOCATION_BASE_URL = 'http://elocation.oracle.com/elocation';

  DvtGeographicMap.BASE_MAP = 'ELOCATION_MERCATOR.WORLD_MAP';

  DvtGeographicMap.prototype.Init = function (callback, callbackObj)
  {
    this._callback = callback;
    this._callbackObj = callbackObj;
    // by default, use google map as the provider
    this.mapProvider = DvtGeographicMap.MAP_PROVIDER_GOOGLE;
    this.mapViewerUrl = DvtGeographicMap.MAP_VIEWER_URL;
    this.eLocationUrl = DvtGeographicMap.ELOCATION_BASE_URL;
    this.baseMap = DvtGeographicMap.BASE_MAP;
    this.selection = [];
    this.initialSelectionApplied = false;// apply selectedRowKeys on a new instance only
    this.screenReaderMode = false;
  };

  /**
   * Returns a new instance of DvtGeographicMap.
   * @param {string} callback The function that should be called to dispatch component events.
   * @param {object} callbackObj The optional object instance on which the callback function is defined.
   * @param {object} options The object containing options specifications for this component.
   * @return {DvtGeographicMap}
   */
  DvtGeographicMap.newInstance = function (callback, callbackObj, options)
  {
    var map = new DvtGeographicMap(callback, callbackObj);
    map.setOptions(options);
    return map;
  };

  /**
   * Returns the map provider
   * @return {string}
   */
  DvtGeographicMap.prototype.getMapProvider = function ()
  {
    return this.mapProvider;
  };

  /**
   * Specifies the map provider
   * @param {string} provider The map provider.
   */
  DvtGeographicMap.prototype.setMapProvider = function (provider)
  {
    // TODO change to supported map providers
    if (provider == DvtGeographicMap.MAP_PROVIDER_ORACLE 
      || provider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      this.mapProvider = provider;
  };

  /**
   * Returns the map viewer url
   * @return {string}
   */
  DvtGeographicMap.prototype.getMapViewerUrl = function ()
  {
    return this.mapViewerUrl;
  };

  DvtGeographicMap.prototype.getELocationUrl = function ()
  {
    return this.eLocationUrl;
  };

  /**
   * Specifies the map viewer url
   * @param {string} mapViewerUrl The map viewer url
   */
  DvtGeographicMap.prototype.setMapViewerUrl = function (url)
  {
    if (url)
    {
      this.mapViewerUrl = url;
    }
  };

  DvtGeographicMap.prototype.setELocationUrl = function (url)
  {
    if (url)
    {
      this.eLocationUrl = url;
    }
  };

  DvtGeographicMap.prototype.setProxyUrl = function (url)
  {
    if (url)
    {
      this.proxyUrl = url;
    }
  };

  DvtGeographicMap.prototype.enableXMLHTTP = function (enable)
  {
    if (enable === true)
    {
      this._enableXMLHTTP = true;
    }
    else
    {
      this._enableXMLHTTP = false;
    }
  };

  DvtGeographicMap.prototype.setMapViewerUrl = function (url)
  {
    if (url)
    {
      this.mapViewerUrl = url;
    }
  };

  DvtGeographicMap.prototype.isEnableXMLHTTP = function ()
  {
    return this._enableXMLHTTP;
  };

  DvtGeographicMap.prototype.getProxyUrl = function ()
  {
    return this.proxyUrl;
  };

  /**
   * Returns the base map
   * @return {string}
   */
  DvtGeographicMap.prototype.getBaseMap = function ()
  {
    return this.baseMap;
  };

  /**
   * Specifies the base map for oracle maps
   * @param {string} baseMap The base map
   */
  DvtGeographicMap.prototype.setBaseMap = function (baseMap)
  {
    this.baseMap = baseMap;
  };

  /**
   * Specifies the non-data options for this component.
   * @param {object} options The object containing options specifications for this component.
   * @protected
   */
  DvtGeographicMap.prototype.setOptions = function (options)
  {
    this.Options = DvtGeographicMapDefaults.calcOptions(options);
  };

  /**
   * Returns the screenReaderMode
   * @return {boolean}
   */
  DvtGeographicMap.prototype.getScreenReaderMode = function ()
  {
    return this.screenReaderMode;
  };

  /**
   * Set the screen reader mode
   * @param {boolean} mode
   */
  DvtGeographicMap.prototype.setScreenReaderMode = function (mode)
  {
    this.screenReaderMode = mode;
  };

  /**
   * Dispatches the event to the callback function.
   * @param {object} event The event to be dispatched.
   */
  DvtGeographicMap.prototype.__dispatchEvent = function (event)
  {
    if (!this._callback)
      return;
    else if (this._callback && this._callback.call)
      this._callback.call(this._callbackObj, event, this);
  };

  /**
   * Renders the component with the specified data.  If no data is supplied to a component
   * that has already been rendered, the component will be rerendered to the specified size.
   * @param {object} mapCanvas The div to render the map.
   * @param {object} data The object containing data for this component.
   * @param {number} width The width of the component.
   * @param {number} height The height of the component.
   */
  DvtGeographicMap.prototype.render = function (mapCanvas, data, width, height)
  {
    this.Data = data;
    this._width = width;
    this._height = height;

    DvtGeographicMapRenderer.render(this, mapCanvas, width, height);
  };

  /**
   * Base class for component level events.
   * @class The base class for component level events.
   * @constructor
   * @export
   */
  var DvtBaseComponentEvent = function()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtBaseComponentEvent, 'adf.mf.internal.dvt.DvtmObject', 'DvtBaseComponentEvent', 'PRIVATE');

  DvtBaseComponentEvent.CLIENT_ROW_KEY = 'clientRowKey';

  /**
   * @param {string} type The event type for this event.
   * @protected
   */
  DvtBaseComponentEvent.prototype.Init = function (type)
  {
    this._type = type;
    this['type'] = type;
  };

  /**
   * Returns the event type for this event.
   * @return {string} The event type for this event.
   * @export
   */
  DvtBaseComponentEvent.prototype.getType = function ()
  {
    return this._type;
  };

  /**
   * Return a list of additional parameter keys
   * @return {array} paramKeys additional parameter keys
   */
  DvtBaseComponentEvent.prototype.getParamKeys = function ()
  {
    return this._paramKeys;
  };

  /**
   * Return a list of additional parameter values
   * @return {array} paramValues additional parameter values
   */
  DvtBaseComponentEvent.prototype._getParamValues = function ()
  {
    return this._paramValues;
  };

  /**
   * Add an additional parameter (key, value) to this event (ex clientRowKey)
   * @param {String} paramKey parameter key
   * @param {String} paramValue parameter value
   */
  DvtBaseComponentEvent.prototype.addParam = function (paramKey, paramValue)
  {
    if (!this._paramKeys)
    {
      this._paramKeys = [];
      this._paramValues = [];
    }

    this._paramKeys.push(paramKey);
    this._paramValues.push(paramValue);
  };

  /**
   * Get parameter value in this event
   * @param {String} paramKey parameter key
   * @return {String} paramValue parameter value
   * @export
   */
  DvtBaseComponentEvent.prototype.getParamValue = function (paramKey)
  {
    if (!paramKey || !this._paramKeys || !this._paramValues)
    {
      return null;
    }

    var index =  - 1;
    for (var i = 0;i < this._paramKeys.length;i++)
    {
      if (this._paramKeys[i] == paramKey)
      {
        index = i;
        break;
      }
    }

    if (index !=  - 1)
    {
      return this._paramValues[index];
    }

    return null;
  };

  /**
   * Default values and utility functions for chart versioning.
   * @class
   */
  var DvtGeographicMapDefaults = function ()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtGeographicMapDefaults, 'adf.mf.internal.dvt.DvtmObject', 'DvtGeographicMapDefaults', 'PRIVATE');

  /**
   * Defaults for version 1.
   */
  DvtGeographicMapDefaults.VERSION_1 =
  {
    'mapOptions' :
    {
      'mapType' : 'ROADMAP',
      'zoomLevel' : '14',
      'centerX' : '-98.57',
      'centerY' : '39.82',
      'doubleClickBehavior' : 'zoomin'
    }
  };

  /**
   * Combines the user options with the defaults for the specified version.  Returns the
   * combined options object.  This object will contain internal attribute values and
   * should be accessed in internal code only.
   * @param {object} userOptions The object containing options specifications for this component.
   * @return {object} The combined options object.
   */
  DvtGeographicMapDefaults.calcOptions = function (userOptions)
  {
    var defaults = DvtGeographicMapDefaults._getDefaults(userOptions);

    // Use defaults if no overrides specified
    if (!userOptions)
      return defaults;
    // add flag to identify if the zoom level is defined
    // in user options or not
    // this is needed during initial zooming
    var explicitZoom = userOptions['mapOptions']['zoomLevel'] ? true : false;
    // Merge the options object with the defaults
    var merged = adf.mf.internal.dvt.util.JSONUtils.mergeObjects(userOptions, defaults);
    merged['mapOptions']['explicitZoom'] = explicitZoom;

    return merged;
  };

  /**
   * Returns the default options object for the specified version of the component.
   * @param {object} userOptions The object containing options specifications for this component.
   * @private
   */
  DvtGeographicMapDefaults._getDefaults = function (userOptions)
  {
    // Note: Version checking will eventually get added here
    // Note: Future defaults objects are deltas on top of previous objects
    return adf.mf.internal.dvt.util.JSONUtils.cloneObject(DvtGeographicMapDefaults.VERSION_1);
  };

  /**
   * Renderer for DvtGeographicMap.
   * @class
   */
  var DvtGeographicMapRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtGeographicMapRenderer, 'adf.mf.internal.dvt.DvtmObject', 'DvtGeographicMapRenderer', 'PRIVATE');

  DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_IMG = 'css/images/geomap/ball_ena.png';
  DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_HOVER_IMG = 'css/images/geomap/ball_ovr.png';
  DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_SELECT_IMG = 'css/images/geomap/ball_sel.png';
  DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_IMG = 'css/images/geomap/red-circle.png';
  DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_HOVER_IMG = 'css/images/geomap/ylw-circle.png';
  DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_SELECT_IMG = 'css/images/geomap/blu-circle.png';
  DvtGeographicMapRenderer.MOUSE_OVER = 'mouseover';
  DvtGeographicMapRenderer.MOUSE_OUT = 'mouseout';
  DvtGeographicMapRenderer.CLICK = 'click';
  DvtGeographicMapRenderer.SEL_NONE = 'none';
  DvtGeographicMapRenderer.SEL_SINGLE = 'single';
  DvtGeographicMapRenderer.SEL_MULTIPLE = 'multiple';

  /**
   * Renders the geographic map in the specified area.
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} mapCanvas The div to render the map.
   * @param {number} width The width of the component.
   * @param {number} height The height of the component.
   */
  DvtGeographicMapRenderer.render = function (map, mapCanvas, width, height)
  {
    var mapProvider = map.getMapProvider();
    if (mapProvider == DvtGeographicMap.MAP_PROVIDER_ORACLE)
      DvtGeographicMapRenderer.renderOracleMap(map, mapCanvas, width, height);
    else if (mapProvider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      DvtGeographicMapRenderer.renderGoogleMap(map, mapCanvas, width, height);

    // For screen reader mode, render the marker shortDesc
    if (map.getScreenReaderMode() == true)
      DvtGeographicMapRenderer.renderMarkerText(map, mapCanvas);
  };

  /**
   * Renders the marker text for screen reader mode
   * @param {DvtGeographicMap} map The geographic map
   * @param {object} mapCanvas The div to render the map.
   */
  DvtGeographicMapRenderer.renderMarkerText = function (map, mapCanvas)
  {
    var data = map.Data;
    var options = map.Options;
    var mapStr = '';
    if (options.mapOptions.shortDesc)
      mapStr = options.mapOptions.shortDesc + ': ';

    var dataLayers = data['dataLayers'];
    for (var i = 0;i < dataLayers.length;i++)
    {
      var dataLayer = dataLayers[i];
      var points = dataLayer['data'];
      for (var j = 0;j < points.length;j++)
      {
        mapStr += DvtGeographicMapRenderer.getTooltip(points[j]) + ', ';
      }
    }

    var length = mapStr.length;
    if (length >= 2)
      mapStr = mapStr.substring(0, length - 2);

    var mapTextDiv = document.createElement('div');
    mapTextDiv.innerHTML = mapStr;
    mapCanvas.parentNode.appendChild(mapTextDiv);
  };

  /**
   * Renders the geographic map in the specified area.
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} mapCanvas The div to render the map.
   * @param {number} width The width of the component.
   * @param {number} height The height of the component.
   * @this
   */
  DvtGeographicMapRenderer.renderOracleMap = function (map, mapCanvas, width, height)
  {
    var options = map.Options;
    var data = map.Data;
    var baseURL = map.getMapViewerUrl();
    var baseMap = map.getBaseMap();
    var proxyUrl = map.getProxyUrl();
    var mapCenterLon = options.mapOptions.centerX;
    var mapCenterLat = options.mapOptions.centerY;
    var mapZoom = options.mapOptions.zoomLevel;
    var doubleClickAction = 'recenter';

    var mpoint;
    if (!map['center'])
      mpoint = MVSdoGeometry.createPoint(parseFloat(mapCenterLon), parseFloat(mapCenterLat), 8307);
    else
      mpoint = map['center'];

    if (!map['_instance'] || map['_lastKey'] !== (baseURL + '/' + baseMap))
    {
      if (map.isEnableXMLHTTP() === true && proxyUrl)
      {
        MVGlobalVariables.proxyURL = proxyUrl;
        MVMapView.enableXMLHTTP(true);
      }
      else
      {
        MVMapView.enableXMLHTTP(false);
      }

      map['_lastKey'] = baseURL + '/' + baseMap;
      map['_instance'] = new MVMapView(mapCanvas, baseURL);
      map['_instance'].addMapTileLayer(new MVBaseMap(baseMap));
    }

    map.initialSelectionApplied = false;
    var mapview = map['_instance'];

    mapview.setCenter(mpoint);
    // filter all empty values
    if (mapZoom)
    {
      mapview.setZoomLevel(parseInt(mapZoom));
    }
    mapview.removeAllFOIs();

    var initialZooming = true;
    if (!DvtGeographicMapRenderer._mapIncludesData(map))
    {
      initialZooming = false;
    }
    else if (options.mapOptions.initialZooming)
      initialZooming = options.mapOptions.initialZooming == 'none' ? false : true;

    // define double click/tap action
    if (options.mapOptions['doubleClickBehavior'] !== undefined)
    {
      doubleClickAction = options.mapOptions['doubleClickBehavior'];
    }
    mapview.setDoubleClickAction(doubleClickAction);

    // set touchHold behaviour
    mapview.setTouchBehavior(
    {
      touchHold : 'mouse_over'
    });

    var fireMapBoundsChangeEvent = function ()
    {
      if (!options.mapOptions.hasMapBoundsChangeActionListener)
      {
        return;
      }

      var bbox = mapview.getMapWindowBBox();
      var center = mapview.getCenter();
      // return immediately if properties not initialized
      if (!bbox || !center)
        return;

      var zoomLevel = mapview.getZoomLevel();

      var callback = function (geom)
      {
        var mbr = geom.getMBR();
        mapview.transformGeom(center, 8307, null, function (centerGeom)
        {
          var evt = new DvtMapBoundsChangeEvent(mbr[0], mbr[1], mbr[2], mbr[3], centerGeom.getPointX(), centerGeom.getPointY(), zoomLevel);
          map.__dispatchEvent(evt);
        });
      };
      // convert to the 8307 coords system
      mapview.transformGeom(bbox, 8307, null, callback);
    };

    var recenter = function ()
    {
      options.mapOptions.initialZooming = 'none';
      map['center'] = mapview.getCenter();
      fireMapBoundsChangeEvent();
    };

    var zoom = function (beforeLevel, afterLevel)
    {
      options.mapOptions.initialZooming = 'none';
      options.mapOptions.zoomLevel = '' + mapview.getZoomLevel();
      fireMapBoundsChangeEvent();
    };

    var clickHandler = function (eventId)
    {
      // convert to the 8307 coords system
      var callback = function (geom)
      {
        var evt = new DvtMapInputEvent(eventId, geom.getPointX(), geom.getPointY());
        map.__dispatchEvent(evt);
      };

      var location = mapview.getMouseLocation();
      mapview.transformGeom(location, 8307, null, callback);
    };

    mapview.attachEventListener(MVEvent.RECENTER, recenter);
    mapview.attachEventListener(MVEvent.ZOOM_LEVEL_CHANGE, zoom);

    if (options.mapOptions.hasMapInputActionListener)
    {
      mapview.attachEventListener(MVEvent.MOUSE_CLICK, function ()
      {
        clickHandler('click')
      });
      mapview.attachEventListener(MVEvent.MOUSE_DOWN, function ()
      {
        clickHandler('mousedown')
      });
      mapview.attachEventListener(MVEvent.MOUSE_UP, function ()
      {
        clickHandler('mouseup')
      });
    }
    // render routes
    DvtGeographicMapRenderer.renderOracleRoutes(map, mapview, data, initialZooming);
    // set the data layer
    DvtGeographicMapRenderer.setOracleMapDataLayer(map, mapview, data, initialZooming);

    mapview.display();
  };

  DvtGeographicMapRenderer.renderOracleRoutes = function(map, mapview, data, initialZooming)
  {
    if (!data.routes || data.routes.length === 0)
      return;

    if (!DvtGeographicMapRenderer['geoCoderAPILoaded'])
    {
      var url = map.getELocationUrl() + '/jslib/oracleelocation.js';
      DvtGeographicMapRenderer.loadJS(url, function()
      {
        DvtGeographicMapRenderer['geoCoderAPILoaded'] = true;
        DvtGeographicMapRenderer.renderOracleRoutes(map, mapview, data, initialZooming);
      });
      return;
    }

    var eloc = new OracleELocation(map.getELocationUrl());

    var createClickHandler = function (clientId, action)
    {
      return function (geom, foi, event)
      {
        var actionEvent = new DvtMapActionEvent(clientId, null, action);
        actionEvent.addParam('actionType', 'click');
        var mbr = mapview.getMapWindowBBox().getMBR();
        if (mbr && geom)
        {
          // get marker coordinates in pixels
          var pixelX = Math.floor((geom.getPointX() - mbr[0]) * mapview.getPixelsPerXUnit());
          var pixelY = Math.floor((mbr[3] - geom.getPointY()) * mapview.getPixelsPerYUnit());
          actionEvent.addParam('pointXY',
          {
            'x' : pixelX, 'y' : pixelY
          });
          // report lat/long in 8307 coordinate system
          var callback = function (transGeom)
          {
            actionEvent.addParam('latLng',
            {
              'lat' : transGeom.getPointY(), 'lng' : transGeom.getPointX()
            });
            map.__dispatchEvent(actionEvent);
          };
          geom = mapview.transformGeom(geom, 8307, null, callback);
        }
      };
    };

    var wayPointTranslator = function (point)
    {
      if (point['address'])
      {
        return point['address'];
      }
      return { lat : point['y'], lon : point['x']};
    };

    var markerParamTranslator = function (point)
    {
      if (point['displayMarker'] !== true)
      {
        return null;
      }
      return DvtGeographicMapRenderer.getParams(point, map.getMapProvider());
    };

    var destinations = data.routes.map(function(route)
    {
      return route["wayPoints"].map(wayPointTranslator);
    });

    var routeStyles = [];
    data.routes.forEach(function(routeOptions)
    {
      var routeStyle = routeOptions['style']['default'];
      var opacity = routeStyle['opacity'];
      if (opacity == null)
      {
        opacity = 1;
      }
      opacity = Math.round(opacity * 255);
      routeStyles.push({
        'render_style':
        {
          'color' : routeStyle['color'] || '#1fb5fb',
          'opacity' : opacity,
          'width' : routeStyle['width'] || 8
        },
        'label': "route"
      });
    });
    var foiCount = 50000;
    eloc.getDirections(destinations,
      function(geocode, routes)
      {
        (routes || []).forEach(function(route, i)
        {
          var routeOptions = data.routes[i];
          var params = routeOptions["wayPoints"].map(markerParamTranslator);
          var routeAction = routeOptions['action'];
          var routeId = routeOptions['id'];
          if (!route.subroutes)
          {
            eloc.attachEventListenerToRoute(route.routeId, MVEvent.MOUSE_CLICK, createClickHandler(routeId, routeAction));
          }
          else
          {
            route.subroutes.forEach(function(subroute, si)
            {
              eloc.attachEventListenerToRoute(subroute.routeId, MVEvent.MOUSE_CLICK, createClickHandler(routeId, routeAction));
            });
          }
          var points = (geocode || [])[i];
          (points || []).forEach(function(point, i)
          {
            if (params[i])
            {
              DvtGeographicMapRenderer.addPointFOI(map, mapview, point, foiCount++, params[i]);
            }
          });
        });
      },
      function()
      {
        console.log("fail");
      },
      {
        ignoreGeocodeErrorsForBatchRequests: true
      },
      {
        'mapview' : mapview,
        'zoomToFit' : initialZooming,
        'removePreviousRoutes': true,
        'drawMarkers': false,
        'routeStyles': routeStyles  
      });
  };

  var _oracleHasMatch = function(addressResult, address)
  {
    if (addressResult)
    {
      switch (addressResult.matchCode)
      {
        case 1: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'Exact match. All fields in the input geocode operation matched values in the geocoding data set.');
          return true;
        case 2: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'All of the input fields of the geocoding operation match the geocoding data except the street type, prefix, or suffix.');
          return true;
        case 3: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'All of the input fields of the geocoding operation match except the house or building number. Also the street type, prefix, or suffix may not match as well.');
          return true;
        case 4: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'The address does not match, but the city name and postal code do match.');
          return true;
        case 10: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'The postal code does not match the input geocoding request, but the city name does match.');
          return true;
        case 11: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'The postal code matches the data used for geocoding, but the city name does not match.');
          return true;
        case 12: adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'The region is matched, but the postal code and city name are not matched.');
          return true;
        default:
      }

      if (addressResult.errorMessage)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'Geocoder error:' + addressResult.errorMessage);
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'No matching address found!');
      }
    }
    else
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', address, 'No matching address found!');
    }
    return false;
  };

  /**
   * Set the data layer on oracle map
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} mapview The MVMapView
   * @param {object} data The geographic map data object
   * @param {boolean} initialZooming Should the map zoom to the data points
   */
  DvtGeographicMapRenderer.setOracleMapDataLayer = function(map, mapview, data, initialZooming)
  {
    var dataLayers = data['dataLayers'];
    var foiCount = 10000;
    var minX = null;
    var maxX = null;
    var minY = null;
    var maxY = null;
    var addrArray = [];
    for (var i = 0;i < dataLayers.length;i++)
    {
      var dataLayer = dataLayers[i];
      var points = dataLayer['data'];
      var selectedRowKeys = DvtGeographicMapRenderer._getSelectedRowKeys(map, dataLayer, i);
      for (var j = 0; j < points.length; j++)
      {
        var params = DvtGeographicMapRenderer.getParams(points[j], DvtGeographicMap.MAP_PROVIDER_ORACLE);
        var selMode = DvtGeographicMapRenderer.getSelMode(dataLayer);

        params['selMode'] = selMode;
        params['dataLayerId'] = dataLayer['id'];

        if (selMode == DvtGeographicMapRenderer.SEL_SINGLE || selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
        {
          params['selected'] = (selectedRowKeys.indexOf(points[j]['_rowKey']) !== -1) ? true : false;
        }
        if (points[j]['x'] && points[j]['y'])
        {
          DvtGeographicMapRenderer.addPointFOI(map, mapview, points[j], foiCount++, params);
          minX = DvtGeographicMapRenderer.getMin(minX, parseFloat(points[j]['x']));
          maxX = DvtGeographicMapRenderer.getMax(maxX, parseFloat(points[j]['x']));
          minY = DvtGeographicMapRenderer.getMin(minY, parseFloat(points[j]['y']));
          maxY = DvtGeographicMapRenderer.getMax(maxY, parseFloat(points[j]['y']));
          if (initialZooming && (i == dataLayers.length - 1 && j == points.length - 1))
          {
            if (map['Options']['mapOptions']['explicitZoom'])
            {
              var mpoint = MVSdoGeometry.createPoint((minX + maxX) / 2, (minY + maxY) / 2, 8307);
              mapview.setCenter(mpoint);
            }
            else
            {
              mapview.zoomToRectangle(MVSdoGeometry.createRectangle(minX, minY, maxX, maxY, 8307));
            }
          }
        }
        else if (points[j]['address'])
        {
          var addr = points[j]['address'];
          var callback = function (mapParams, address)
          {
            map['_jobs'] = map['_jobs'] ? map['_jobs'] + 1 : 1;
            return function(gcResult)
            {
              map['_jobs'] = map['_jobs'] - 1;
              // one or more matching address is found
              // we get the first one
              var addrObj = gcResult[0];
              if (_oracleHasMatch(addrObj, address))
              {
                DvtGeographicMapRenderer.addPointFOI(map, mapview, addrObj, foiCount++, mapParams);
                // This cannot be simply moved outside the loop because the callback may not be finished after the loop ends
                minX = DvtGeographicMapRenderer.getMin(minX, parseFloat(addrObj['x']));
                maxX = DvtGeographicMapRenderer.getMax(maxX, parseFloat(addrObj['x']));
                minY = DvtGeographicMapRenderer.getMin(minY, parseFloat(addrObj['y']));
                maxY = DvtGeographicMapRenderer.getMax(maxY, parseFloat(addrObj['y']));
              }

              if (initialZooming && map['_jobs'] === 0 && (minX && maxX && minY && maxY))
              {
                delete map['_jobs'];
                if (map['Options']['mapOptions']['explicitZoom'])
                {
                  var mpoint = MVSdoGeometry.createPoint((minX + maxX) / 2, (minY + maxY) / 2, 8307);
                  mapview.setCenter(mpoint);
                }
                else
                {
                  mapview.zoomToRectangle(MVSdoGeometry.createRectangle(minX, minY, maxX, maxY, 8307));
                }
              }
            }
          };

          var url = map.getELocationUrl() + '/jslib/oracleelocation.js';
          var success = function (address, mapParams)
          {
            // need this closure since this is in a loop
            return function ()
            {
              DvtGeographicMapRenderer['geoCoderAPILoaded'] = true;
              var eloc = new OracleELocation(map.getELocationUrl());
              eloc.geocode(address, callback(mapParams, address));
            }
          };

          var failure = function()
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', 'setOracleMapDataLayer', 'Failed to load GeoCoder API!');
          };

          if (!DvtGeographicMapRenderer['geoCoderAPILoaded'])
          {
            DvtGeographicMapRenderer.loadJS(url, success(addr, params), failure);
          }
          else
          {
            success(addr, params)();
          }
        }
      }
    }
    map.initialSelectionApplied = true;// initial selection has been applied by now
  };

  /**
   * Add point FOI to map
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} mapview The map view
   * @param {object} point The point
   * @param {string} pointId The point ID
   * @param {params} params The params for the point foi
   */
  DvtGeographicMapRenderer.addPointFOI = function (map, mapview, point, pointId, params)
  {
    var action = params['action'];
    var selMode = params['selMode'];
    var dataLayerId = params['dataLayerId'];
    var selected = params['selected'];
    var sourceImg;

    if (selected)
    {
      sourceImg = params['sourceSelected'];
    }
    else
    {
      sourceImg = params['source'];
    }
    var geoPoint = MVSdoGeometry.createPoint(parseFloat(point['x']), parseFloat(point['y']), 8307);
    var pointFOI = MVFOI.createMarkerFOI(pointId.toString(), geoPoint, sourceImg);
    if (params['tooltip'])
      pointFOI.setInfoTip(params['tooltip']);
    if (params['opacity'])
      pointFOI.setOpacity(params['opacity']);
    if (params.label)
    {
      var translateX = -50;
      if (document.documentElement.dir == "rtl")
      {
         translateX *= -1;
      }
      var span = "<span " +
      "style=\"" + (params.labelStyle || "") + ";" +
        "position:absolute;" +
        "-webkit-transform: translateX(" + translateX + "%);" +
        "transform: translateX(" + translateX + "%);" +
        "white-space:nowrap;" +
      "\">" +
      params.label +
      "</span>";

      var top = 0;
      switch (params['labelPosition'])
      {
        case "center" :
          top = 0
          break;
        case "top" :
          top = (-1) * Math.floor(params["height"] / 2);
          break;
        case "bottom" :
        default:
          top = Math.floor(params["height"] / 2);
      }

      pointFOI.setHTMLElement(span, Math.floor(params["width"] / 2), top);
    }
    // attach selection related event listeners
    if (selMode == DvtGeographicMapRenderer.SEL_SINGLE || selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
    {
      if (!amx.hasTouch())
      {
        // bug 18113730: do not register hover listeners on touch devices
        DvtGeographicMapRenderer.attachEventListener(map, pointFOI, DvtGeographicMapRenderer.MOUSE_OVER, params);
        DvtGeographicMapRenderer.attachEventListener(map, pointFOI, DvtGeographicMapRenderer.MOUSE_OUT, params);
      }
      DvtGeographicMapRenderer.attachEventListener(map, pointFOI, DvtGeographicMapRenderer.CLICK, params);
      // if the point is selected, add it to the selection cache
      if (selected)
      {
        var selection = map['selection'][dataLayerId];
        if (selection === undefined)
        {
          selection = map['selection'][dataLayerId] = [];
        }
        pointFOI['selected'] = true;
        pointFOI['rowKey'] = params['rowKey'];
        pointFOI['dataLayerId'] = dataLayerId;
        selection.push(pointFOI);
      }
    }

    if (action)
    {
      // real listener implementation that handles click and tapHold on the FOI point
      var listener = function (event)
      {
        var actionEvent = new DvtMapActionEvent(params['clientId'], params['rowKey'], action);
        actionEvent.addParam('dataLayerId', params['dataLayerId']);
        actionEvent.addParam('actionType', event.data.type);
        var mbr = mapview.getMapWindowBBox().getMBR();
        var geom = pointFOI.getGeometry();
        if (mbr && geom)
        {
          // get marker coordinates in pixels
          var pixelX = Math.floor((geom.getPointX() - mbr[0]) * mapview.getPixelsPerXUnit());
          var pixelY = Math.floor((mbr[3] - geom.getPointY()) * mapview.getPixelsPerYUnit());
          actionEvent.addParam('pointXY',
          {
            'x' : pixelX, 'y' : pixelY
          });
          // report lat/long in 8307 coordinate system
          var callback = function (transGeom)
          {
            actionEvent.addParam('latLng',
            {
              'lat' : transGeom.getPointY(), 'lng' : transGeom.getPointX()
            });
            map.__dispatchEvent(actionEvent);
          };
          geom = mapview.transformGeom(geom, 8307, null, callback);
        }
        else
        {
          map.__dispatchEvent(actionEvent);
        }
      };
      // function that registers 
      var registrator = function(start, stop, cancel)
      {
        pointFOI.attachEventListener(MVEvent.MOUSE_DOWN, start);
        // click is used since mouse_up event is not working here
        pointFOI.attachEventListener(MVEvent.MOUSE_CLICK, stop);
        pointFOI.attachEventListener(MVEvent.MOUSE_OUT, cancel);
      };

      _addTapHoldEventListener(pointFOI, registrator, listener);
    }

    mapview.removeFOI(pointFOI);
    mapview.addFOI(pointFOI);
  };

  /**
   * Attach event listeners
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} pointFOI The point FOI
   * @param {string} eventType The event type
   * @param {object} params The params for the point foi
   */
  DvtGeographicMapRenderer.attachEventListener = function (map, pointFOI, eventType, params)
  {
    switch (eventType)
    {
      case DvtGeographicMapRenderer.MOUSE_OVER:
        pointFOI.attachEventListener(MVEvent.MOUSE_OVER, function ()
        {
          if (!pointFOI.selected)
          {
            pointFOI.updateImageURL(params['sourceHover']);
          }
          else
          {
            pointFOI.updateImageURL(params['sourceHoverSelected']);
          }
        });
        break;
      case DvtGeographicMapRenderer.MOUSE_OUT:
        pointFOI.attachEventListener(MVEvent.MOUSE_OUT, function ()
        {
          if (!pointFOI.selected)
          {
            pointFOI.updateImageURL(params['source']);
          }
        });
        break;
      case DvtGeographicMapRenderer.CLICK:
        pointFOI.attachEventListener(MVEvent.MOUSE_CLICK, function ()
        {
          var id = params['dataLayerId'];
          var i;
          if (!map.selection[id])
            map.selection[id] = [];
          var selMode = params['selMode'];
          if (!pointFOI.selected)
          {
            var selection = map.selection[id];
            if (selMode == DvtGeographicMapRenderer.SEL_SINGLE)
            {
              if (selection.length != 0)
              {
                for (i = 0;i < selection.length;i++)
                {
                  selection[i].updateImageURL(params['source']);
                  selection[i].selected = false;
                }
                map.selection[id] = [];
              }
            }
            pointFOI.updateImageURL(params['sourceSelected']);
            pointFOI.selected = true;
            pointFOI.rowKey = params['rowKey'];
            pointFOI.dataLayerId = id;
            map.selection[id].push(pointFOI);
          }
          else
          {
            // deselect
            pointFOI.updateImageURL(params['source']);
            pointFOI.selected = false;
            // remove from selection
            if (selMode == DvtGeographicMapRenderer.SEL_SINGLE)
            {
              map.selection[id] = [];
            }
            else if (selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
            {
              for (i = 0;i < map.selection[id].length;i++)
              {
                if (pointFOI.getId() == map.selection[id][i].getId())
                {
                  map.selection[id].splice(i, 1);
                  break;
                }
              }
            }
          }
          var evt = new DvtGeoMapSelectionEvent(map.selection[id]);
          evt.addParam('dataLayerId', id);
          map.__dispatchEvent(evt);
        });
        break;
      default :
        break;
    }
  };

  /**
   * Renders the geographic map in the specified area.
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} mapCanvas The div to render the map.
   * @param {number} width The width of the component.
   * @param {number} height The height of the component.
   * @this
   */
  DvtGeographicMapRenderer.renderGoogleMap = function (map, mapCanvas, width, height)
  {
    var options = map.Options;
    var data = map.Data;

    var mapTypeId = '';

    switch (options.mapOptions.mapType)
    {
      case 'ROADMAP':
        mapTypeId = google.maps.MapTypeId.ROADMAP;
        break;
      case 'SATELLITE':
        mapTypeId = google.maps.MapTypeId.SATELLITE;
        break;
      case 'HYBRID':
        mapTypeId = google.maps.MapTypeId.HYBRID;
        break;
      case 'TERRAIN':
        mapTypeId = google.maps.MapTypeId.TERRAIN;
        break;
      default :
        mapTypeId = google.maps.MapTypeId.ROADMAP;
        break;
    }

    map.initialSelectionApplied = false;
    var initialZooming = true;
    if (!DvtGeographicMapRenderer._mapIncludesData(map))
    {
      initialZooming = false;
    }
    else if (options.mapOptions.initialZooming)
    {
      initialZooming = options.mapOptions.initialZooming == 'none' ? false : true;
    }
    var animationOnDisplay = 'none';
    if (options.mapOptions.animationOnDisplay)
    {
      animationOnDisplay = options.mapOptions.animationOnDisplay;
    }

    var gmap;
    map._firstTime = false;

    if (initialZooming)
    {
      // create empty instance of the google map without information
      // about the map type - this prevents map from rendering immediately
      if (!map['_googlemap'])
      {
        map._firstTime = true;
        // create google map instance on the map component
        map['_googlemap'] = new google.maps.Map(mapCanvas);
      }
      gmap = map['_googlemap'];
    }
    else
    {
      // resolve information required for the map without initial zooming
      var mapCenterLon = parseFloat(options.mapOptions.centerX);
      var mapCenterLat = parseFloat(options.mapOptions.centerY);
      // create standard map which will be displayed imediately
      if (!map['_googlemap'])
      {
        map._firstTime = true;
        // prepare initial options
        var mapOptions = new Object();
        mapOptions.mapTypeId = mapTypeId;
        // create google map instance on the map component
        map['_googlemap'] = new google.maps.Map(mapCanvas, mapOptions);
      }

      gmap = map['_googlemap'];
      gmap.setCenter(new google.maps.LatLng(mapCenterLat, mapCenterLon));
      gmap.setZoom(parseInt(options.mapOptions.zoomLevel));
    }
    // set map type
    gmap.setMapTypeId(mapTypeId);
    // remove all old markers from the google map instance
    if (map._currentMarkers)
    {
      for (var ind = 0;ind < map._currentMarkers.length;ind++)
      {
        if (map._currentMarkers[ind] && map._currentMarkers[ind].setMap)
        {
          map._currentMarkers[ind].setMap(null);
        }
      }
      // clear array of old markers
      map._currentMarkers.length = 0;
    }
    else
    {
      map._currentMarkers = [];
    }

    DvtGeographicMapRenderer.googleMapRenderRoutes(map, gmap, data, initialZooming);
    // set the data layer
    DvtGeographicMapRenderer.setGoogleMapDataLayer(map, gmap, data, initialZooming, animationOnDisplay);
    // when map is initialized in hidden panel, we need to resize and recenter the map
    google.maps.event.addListenerOnce(gmap, 'idle', function ()
    {
      var center = gmap.getCenter();
      google.maps.event.trigger(gmap, 'resize');
      gmap.setCenter(center);
    });
  };

  DvtGeographicMapRenderer.googleMapRenderRoutes = function (map, gmap, data, initialZooming)
  {
    if (!data.routes || data.routes.length === 0)
      return;

    var routeBounds = null;
    var requests = 0;

    data.routes.forEach(function (routeOptions)
    {
      if (!routeOptions["wayPoints"] || routeOptions["wayPoints"].length < 2)
      {
        return;
      }

      var tMode = null;
      var mode = routeOptions['travelMode'];
      if (mode)
        mode = mode.toLowerCase();
      switch (mode)
      {
        case 'walking':
          tMode = google.maps.TravelMode.WALKING;
          break;
        case 'cycling':
          tMode = google.maps.TravelMode.BICYCLING;
          break;
        default :
          tMode = google.maps.TravelMode.DRIVING;
      }

      var wayPointTranslator = function (point)
      {
        if (point['address'])
        {
          return {location : point['address']};
        }
        return {location : new google.maps.LatLng(point['y'], point['x'])};
      };

      var markerParamTranslator = function (point)
      {
        if (point['displayMarker'] !== true)
        {
          return null;
        }
        return DvtGeographicMapRenderer.getParams(point, map.getMapProvider());
      };

      var wayPoints = routeOptions["wayPoints"].map(wayPointTranslator);
      var params = routeOptions["wayPoints"].map(markerParamTranslator);

      var directionsService = new google.maps.DirectionsService();

      var request =
      {
        origin : wayPoints[0]['location'], destination : wayPoints[wayPoints.length - 1]['location'], travelMode : tMode, provideRouteAlternatives : false, waypoints : wayPoints.slice(1, wayPoints.length - 1)
      };

      var routeStyle = routeOptions['style']['default'];
      var polyOptions =
      {
        strokeColor : routeStyle['color'] || '#1fb5fb', strokeOpacity : routeStyle['opacity'] || 1, strokeWeight : routeStyle['width'] || 8
      };

      var routeAction = routeOptions['action'];
      var routeId = routeOptions['id'];

      requests++;
      directionsService.route(request, function (result, status)
      {
        requests--;
        var createClickHandler = function (clientId, action)
        {
          return function (e)
          {
            var actionEvent = new DvtMapActionEvent(clientId, null, action);
            var clickPosition = e.latLng;
            var pointXY = fromLatLngToPixel(gmap, clickPosition);
            actionEvent.addParam('pointXY',
            {
              'x' : pointXY.x, 'y' : pointXY.y
            });
            actionEvent.addParam('latLng',
            {
              'lat' : clickPosition.lat(), 'lng' : clickPosition.lng()
            });

            map.__dispatchEvent(actionEvent);
          };
        };

        if (status === google.maps.DirectionsStatus.OK)
        {
          result.routes.forEach(function (route, routeIndex)
          {
            if (initialZooming)
            {
              if (!routeBounds)
              {
                routeBounds = route.bounds;
              }
              routeBounds = routeBounds.union(route.bounds);
              if (requests === 0 && routeBounds)
              {
                gmap.fitBounds(routeBounds);
                routeBounds = null;
              }
            }
            route.legs.forEach(function (leg, legIndex)
            {
              if (params[legIndex])
              {
                DvtGeographicMapRenderer.processGoogleMapDataPoint(map, gmap, leg['start_location'], params[legIndex], false, false);
              }
              if (legIndex === route.legs.length - 1 && params[legIndex + 1])
              {
                DvtGeographicMapRenderer.processGoogleMapDataPoint(map, gmap, leg['end_location'], params[legIndex + 1], false, false);
              }

              leg.steps.forEach(function (step, stepIndex)
              {
                var polyline = new google.maps.Polyline(polyOptions);
                polyline.setPath(step.path);

                if (routeAction)
                {
                  google.maps.event.addListener(polyline, DvtGeographicMapRenderer.CLICK, createClickHandler(routeId, routeAction));
                }

                polyline.setMap(gmap);
                // need to remove this on the next search
                map._currentMarkers = map._currentMarkers || [];
                map._currentMarkers.push(polyline);
              });
            });
          });
        }
        else
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', 'googleMapRenderRoutes', 'Can\'t render the route because of the service error.');
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE, 'adf.mf.internal.dvt.geomap.DvtGeographicMap', 'googleMapRenderRoutes', 'Can\'t render the route because of the service error [returned status: \'' + status + '\']');
        }
      });
    });
  };

  var TextOverlay = null;

  var createTextOverlayClass = function()
  {
    if (!TextOverlay)
    {
      /** @constructor */
      TextOverlay = function(map, gmap) {

        // Now initialize all properties.
        this.instance_ = map;
        this.map_ = gmap;

        // Define a property to hold the texts' div. We'll
        // actually create this div upon receipt of the onAdd()
        // method so we'll leave it null for now.
        this.div_ = null;

        // Explicitly call setMap on this overlay
        this.setMap(gmap);
      };

      TextOverlay.prototype = new google.maps.OverlayView();

      /**
       * onAdd is called when the map's panes are ready and the overlay has been
       * added to the map.
       */
      TextOverlay.prototype.onAdd = function() {

        var div = document.createElement('div');
        div.style.border = 'none';
        div.style.borderWidth = '0px';
        div.style.position = 'absolute';
        div.style.left = 0;
        div.style.top = 0;
        div.style.right = 0;
        div.style.down = 0;

        this.div_ = div;

        // Add the element to the "overlayImage" pane.
        var panes = this.getPanes();
        panes.overlayImage.appendChild(this.div_);
      };

      TextOverlay.prototype.draw = function() {

        // We use the south-west and north-east
        // coordinates of the overlay to peg it to the correct position and size.
        // To do this, we need to retrieve the projection from the overlay.
        var overlayProjection = this.getProjection();
        var map = this.getMap();
        var bounds = map.getBounds();
        var div = this.div_;
        div.innerHTML = "";
        this.instance_._currentMarkers.forEach(function(marker)
        {
          if (marker.label && marker.getVisible())
          {
            var latLng = marker.getPosition();
            if (bounds.contains(latLng))
            {
              // retrieve pixel coordinates for the latlng position of the marker
              var position = overlayProjection.fromLatLngToDivPixel(latLng);

              var span = document.createElement("span");
              span.textContent = marker.label;
              if (marker.labelStyle)
              {
                span.setAttribute("style", marker.labelStyle);
              }

              span.style.position = "absolute";
              span.style.whiteSpace = "nowrap";
              span.style.right = "auto";
              span.style.bottom = "auto";
              span.style.width = "auto";
              span.style.height = "auto";

              div.appendChild(span);

              span.style.left = (position.x - span.offsetWidth / 2) + 'px';
              var icon = marker.getIcon();

              switch (marker.labelPosition)
              {
                case "center" :
                  span.style.top = (position.y - Math.floor((icon.size.height + span.offsetHeight) / 2 )) + 'px';
                  break;
                case "top" :
                  span.style.top = (position.y - Math.floor((icon.size.height + span.offsetHeight)) - 1) + 'px';
                  break;
                case "bottom" :
                default:
                   span.style.top = (position.y + 1) + 'px';
              }
            }
          }
        });
      };

      TextOverlay.prototype.onRemove = function() {
        this.div_.parentNode.removeChild(this.div_);
      };

      // Set the visibility to 'hidden' or 'visible'.
      TextOverlay.prototype.hide = function() {
        if (this.div_) {
          // The visibility property must be a string enclosed in quotes.
          this.div_.style.visibility = 'hidden';
        }
      };

      TextOverlay.prototype.show = function() {
        if (this.div_) {
          this.div_.style.visibility = 'visible';
        }
      };

      TextOverlay.prototype.toggle = function() {
        if (this.div_) {
          if (this.div_.style.visibility === 'hidden') {
            this.show();
          } else {
            this.hide();
          }
        }
      };

      // Detach the map from the DOM via toggleDOM().
      // Note that if we later reattach the map, it will be visible again,
      // because the containing <div> is recreated in the overlay's onAdd() method.
      TextOverlay.prototype.toggleDOM = function() {
        if (this.getMap()) {
          // Note: setMap(null) calls OverlayView.onRemove()
          this.setMap(null);
        } else {
          this.setMap(this.map_);
        }
      };
    }
  };

  /**
   * @param {DvtGeographicMap} gmap Google Map instance
   * @param {object} map instance of the GeographicMap
   * @param {array} points Arraz of data points
   * @this
   */
  DvtGeographicMapRenderer.googleMapRenderEnd = function (gmap, map, points)
  {
    createTextOverlayClass();
    var geocoderQueue = [];
    // process all resolved marker points and add them to the google map
    for (var i = 0;i < points.length;i++)
    {
      var point = points[i];
      if (point)
      {
        if (point['resolved'] === true)
        {
          DvtGeographicMapRenderer.processGoogleMapDataPoint(map, gmap, point['latLng'], point['params'], point['animation'], point['initialZooming']);
        }
        else
        {
          geocoderQueue.push(point);
        }
      }
    }

    if (geocoderQueue.length > 0)
    {
      var timeStamp = (new Date()).getTime();
      var callback = function (markerParams, aAddress, animation)
      {
        return function (results, status)
        {
          // add map point when result is returned
          if (status === google.maps.GeocoderStatus.OK)
          {
            var addrMarkerLatLng = results[0].geometry.location;
            DvtGeographicMapRenderer._addresscache[aAddress] = addrMarkerLatLng;
            timeStamp = (new Date()).getTime();
            DvtGeographicMapRenderer.processGoogleMapDataPoint(map, gmap, addrMarkerLatLng, markerParams, animation, false);
          }

          if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT)
          {
            geocoderQueue.push(
            {
              'resolved' : false, 'address' : aAddress, 'params' : markerParams, 'animation' : animation, 'initialZooming' : false
            });
          }
        }
      };

      var ITEMS_PER_SECOND = 10;

      setTimeout(function (geocoderCallback, renderer, queue)
      {
        var geocoder = new google.maps.Geocoder();
        var consumer = window.setInterval(function ()
        {
          if (queue.length === 0 || (new Date()).getTime() - timeStamp > 3000)
          {
            clearInterval(consumer);
            if ((new Date()).getTime() - timeStamp > 3000)
            {
              throw new Error('ERR_DAILY_QUOTA_EXCEEDED');
            }
            return;
          }

          var geo = queue.shift();
          if (geo)
          {
            var address = geo['address'];
            // create address cache if not exists
            if (renderer._addresscache === undefined)
            {
              renderer._addresscache =
              {
              };
            }
            // try to load information about address location from cache
            var cachedPoint = renderer._addresscache[address];
            if (cachedPoint)
            {
              renderer.processGoogleMapDataPoint(map, gmap, cachedPoint, geo['params'], geo['animation'], false);
            }
            else
            {
              geocoder.geocode(
              {
                'address' : address
              },
              geocoderCallback(geo['params'], address, geo['animation']));
            }
          }
        },
        Math.floor(1000 / ITEMS_PER_SECOND) + 1);
      }, 1000 - Math.floor(1000 / ITEMS_PER_SECOND) + 1, callback, DvtGeographicMapRenderer, geocoderQueue);
    }

    map.initialSelectionApplied = true;// initial selection has been applied by now
    // when bounds are selected zoom to them
    if (map._bounds)
    {
      var zoomLevel = parseInt(map['Options']['mapOptions']['zoomLevel']);
      var ne = map._bounds.getNorthEast();
      var sw = map._bounds.getSouthWest();
      // when northeast and southwest corners of the map bounds are equal
      // then zoom only to one point
      if (ne.equals(sw))
      {
        DvtGeographicMapRenderer.zoomToMarker(gmap, ne, zoomLevel);
      }
      // in case that there is explicit zoom set by developer
      // use initial zoom only to center the map and use
      // custom zoom level as default
      else if (map['Options']['mapOptions']['explicitZoom'])
      {
        var center = map._bounds.getCenter();
        DvtGeographicMapRenderer.zoomToMarker(gmap, center, zoomLevel);
      }
      else
      {
        gmap.fitBounds(map._bounds);
      }

      map._bounds = null;
    }
    else if (!gmap.getZoom())
    {
      var centerLat = parseFloat(map['Options']['mapOptions']['centerY']);
      var centerLng = parseFloat(map['Options']['mapOptions']['centerX']);

      var center = new google.maps.LatLng(centerLat, centerLng);

      DvtGeographicMapRenderer.zoomToMarker(gmap, center, 2);
    }

    // register listeners which handle user interaction with map on the first time map is rendered
    if (map._firstTime)
    {
      map.textOverlay = new TextOverlay(map, gmap);
      // this method fires an MapBoundsChangeEvent on map view property changes
      var fireMapBoundsChangeEvent = function ()
      {
        var options = map['Options'];
        if (!options.mapOptions.hasMapBoundsChangeActionListener)
        {
          return;
        }
        var bounds = gmap.getBounds();
        var zoomLevel = gmap.getZoom();
        // bug 17863212: return immediately if map not fully initialized yet
        if (!bounds)
          return;

        var evt = new DvtMapBoundsChangeEvent(bounds.getSouthWest().lng(), bounds.getSouthWest().lat(), bounds.getNorthEast().lng(), bounds.getNorthEast().lat(), bounds.getCenter().lng(), bounds.getCenter().lat(), zoomLevel);
        map.__dispatchEvent(evt);
      };

      // save information about new map center and zoom when user change it by dragging the map
      // user interaction is similar to changing of properties of the map so store it to Options of the map.
      google.maps.event.addListener(gmap, 'dragend', function ()
      {
        // renderer should reset all these options object on component refresh
        var options = map['Options'];
        var center = gmap.getCenter();
        if (center)
        {
          options.mapOptions.centerX = '' + center.lng();
          options.mapOptions.centerY = '' + center.lat();
        }
        var zoom = gmap.getZoom();
        if (zoom)
        {
          options.mapOptions.zoomLevel = '' + zoom;
        }
        if (zoom || center)
        {
          options.mapOptions.initialZooming = 'none';
        }
        // notify clients
        fireMapBoundsChangeEvent();
      });

      // store information about user selected map type
      google.maps.event.addListener(gmap, 'maptypeid_changed', function ()
      {
        var options = map['Options'];
        switch (gmap.getMapTypeId())
        {
          case google.maps.MapTypeId.ROADMAP:
            options.mapOptions.mapType = 'ROADMAP';
            break;
          case google.maps.MapTypeId.SATELLITE:
            options.mapOptions.mapType = 'SATELLITE';
            break;
          case google.maps.MapTypeId.HYBRID:
            options.mapOptions.mapType = 'HYBRID';
            break;
          case google.maps.MapTypeId.TERRAIN:
            options.mapOptions.mapType = 'TERRAIN';
            break;
          default :
            options.mapOptions.mapType = 'ROADMAP';
            break;
        }
      });

      var clickHandler = function (eventId, event)
      {
        var latLng = event.latLng;
        var evt = new DvtMapInputEvent('click', latLng.lng(), latLng.lat());
        map.__dispatchEvent(evt);
      };

      var lastLatLng = null;

      var domEventHandler = function (eventId)
      {
        if (lastLatLng)
        {
          var evt = new DvtMapInputEvent(eventId, lastLatLng.lng(), lastLatLng.lat());
          map.__dispatchEvent(evt);
        }
      };

      var mouseMoveHandler = function (event)
      {
        lastLatLng = event.latLng;
      };

      if (map['Options'].mapOptions.hasMapInputActionListener)
      {
        google.maps.event.addListener(gmap, 'click', function (event)
        {
          clickHandler('click', event);
        });
        google.maps.event.addListener(gmap, 'mousemove', function (event)
        {
          mouseMoveHandler(event)
        });
        google.maps.event.addDomListener(gmap.getDiv(), 'mousedown', function (event)
        {
          domEventHandler('mousedown');
        });
        google.maps.event.addDomListener(gmap.getDiv(), 'mouseup', function (event)
        {
          domEventHandler('mouseup');
        });
      }

      google.maps.event.addListener(gmap, 'zoom_changed', fireMapBoundsChangeEvent);
    }
  };

  /**
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} gmap The google map
   * @param {object} markerLatLng
   * @param {params} params The params for the marker
   * @param {string} animation Marker animation
   * @param {boolean} initialZooming Should the map zoom to the data points
   * @this
   */
  DvtGeographicMapRenderer.processGoogleMapDataPoint = function (map, gmap, markerLatLng, params, animation, initialZooming)
  {
    // add marker into the map
    DvtGeographicMapRenderer.addMarker(map, gmap, markerLatLng, params, animation);
    // when initial zooming is enabled determin proper bounds for all markers
    if (initialZooming)
    {
      if (!map._bounds)
      {
        map._bounds = new google.maps.LatLngBounds(markerLatLng, markerLatLng);
      }
      // function extends current bounds to include new marker
      map._bounds = map._bounds.extend(markerLatLng);
    }
  };

    // --------- Tap Hold --------- //
  var tapHoldPendingIds = {};

  function cancelPendingTapHold()
  {
    tapHoldPendingIds = {};
  }

  var holdThreshold = 800;

  var _addTapHoldEventListener = function(marker, listenerAddCallback, listener, eventData)
  {
    eventData = eventData || {};
    var tapId = null;
    var startListener = function(event)
    {
      tapId = amx.uuid(); // TODO don't use amx.foo!
      tapHoldPendingIds[tapId] = new Date().getTime();

      setTimeout(function()
      {
        // Note: here we double check if the time is greater than the threshold. This is useful since sometime timeout
        //       is not really reliable.
        if (tapHoldPendingIds[tapId] > 0)
        {
          delete tapHoldPendingIds[tapId];
          // Call the listener but make sure our eventData is used:
          var eventDataToRestore = event.data;
          event.data = eventData;
          event.data.type = "tapHold";
          listener.call(marker, event);
          event.data = eventDataToRestore;
        }

      }, holdThreshold);
    };

    var endListener = function(event)
    {
      if (tapHoldPendingIds[tapId])
      {
        delete tapHoldPendingIds[tapId];
      
        var eventDataToRestore = event.data;
        event.data = eventData;
        event.data.type = "click";
        listener.call(marker, event);
        event.data = eventDataToRestore;
      }
    };

    listenerAddCallback.call(this, startListener, endListener, cancelPendingTapHold);
  };
  // --------- /Tap Hold --------- //


  /**
   * Set the data layer on google map
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} gmap The google map
   * @param {object} data The geographic map data object
   * @param {boolean} initialZooming Should the map zoom to the data points
   * @param {string} animation Marker animation
   * @this
   */
  DvtGeographicMapRenderer.setGoogleMapDataLayer = function (map, gmap, data, initialZooming, animation)
  {
    map._bounds = null;
    var dataLayers = data['dataLayers'];
    map._jobCount = 0;// number of remaining map points to resolve
    var result = [];
    var index = 0;

    var geocoder = undefined;
    var geocoderRequestCount = 0;
    for (var i = 0;i < dataLayers.length;i++)
    {
      var dataLayer = dataLayers[i];
      var points = dataLayer['data'];
      var selectedRowKeys = DvtGeographicMapRenderer._getSelectedRowKeys(map, dataLayer, i);

      map._jobCount += points.length;
      result.length += points.length;

      for (var j = 0;j < points.length;j++)
      {
        var params = DvtGeographicMapRenderer.getParams(points[j], map.getMapProvider());
        var selMode = DvtGeographicMapRenderer.getSelMode(dataLayer);

        params['selMode'] = selMode;
        params['dataLayerId'] = dataLayer['id'];

        if (selMode == DvtGeographicMapRenderer.SEL_SINGLE || selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
        {
          params['selected'] = (selectedRowKeys.indexOf(points[j]['_rowKey']) !==  - 1) ? true : false;
        }

        if (points[j]['x'] && points[j]['y'])
        {
          var markerLatLng = new google.maps.LatLng(parseFloat(points[j]['y']), parseFloat(points[j]['x']));
          result[index] =
          {
            'resolved' : true, 'latLng' : markerLatLng, 'params' : params, 'animation' : animation, 'initialZooming' : initialZooming
          };
          map._jobCount--;// map point resolved
        }
        else if (points[j]['address'])
        {
          var address = points[j]['address'];
          // create address cache if not exists
          if (DvtGeographicMapRenderer._addresscache === undefined)
          {
            DvtGeographicMapRenderer._addresscache =
            {
            };
          }
          // try to load information about address location from cache
          var cachedPoint = DvtGeographicMapRenderer._addresscache[address];
          if (cachedPoint)
          {
            result[index] =
            {
              'resolved' : true, 'address' : address, 'latLng' : cachedPoint, 'params' : params, 'animation' : animation, 'initialZooming' : initialZooming
            };
            map._jobCount--;// map point resolved
          }
          else
          {
            // callback object which handles result from geocoder
            var callback = function (map, markerParams, aIndex, aAddress)
            {
              return function (results, status)
              {
                map._jobCount--;
                // add map point when result is returned
                if (status == google.maps.GeocoderStatus.OK)
                {
                  var addrMarkerLatLng = results[0].geometry.location;
                  DvtGeographicMapRenderer._addresscache[aAddress] = addrMarkerLatLng;

                  result[aIndex] =
                  {
                    'resolved' : true, 'address' : aAddress, 'latLng' : addrMarkerLatLng, 'params' : markerParams, 'animation' : animation, 'initialZooming' : initialZooming
                  };
                }

                if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT)
                {
                  result[aIndex] =
                  {
                    'resolved' : false, 'address' : aAddress, 'params' : markerParams, 'animation' : animation, 'initialZooming' : initialZooming
                  };
                }

                // endpoint of asynchronous callback
                if (map._jobCount === 0)
                {
                  DvtGeographicMapRenderer.googleMapRenderEnd(gmap, map, result);
                }
              }
            };
            // create geocoder service if it does not exist
            if (geocoder === undefined)
            {
              geocoder = new google.maps.Geocoder();
            }

            if (geocoderRequestCount < 10)
            {
              geocoderRequestCount++;
              geocoder.geocode(
              {
                'address' : address
              },
              callback(map, params, index, address));
            }
            else
            {
              map._jobCount--;
              result[index] =
              {
                'resolved' : false, 'address' : address, 'params' : params, 'animation' : animation, 'initialZooming' : initialZooming
              };
            }
          }
        }
        index++;
      }
    }
    // in case there are no points or all points have been already added call end function
    if (map._jobCount === 0)
    {
      DvtGeographicMapRenderer.googleMapRenderEnd(gmap, map, result);
    }
  };

  var __getMarkerIcon = function (image, params)
  {
    var dim = new google.maps.Size(params['width'] * params['scaleX'], params['height'] * params['scaleY']);
    return {
      url : image,
      size : dim,
      scaledSize : dim
    };
  };

  /**
   * Add marker to map
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} gmap The google map
   * @param {object} markerLatLng
   * @param {params} params The params for the point foi
   * @param {string} animation Marker animation
   * @this
   */
  DvtGeographicMapRenderer.addMarker = function (map, gmap, markerLatLng, params, animation)
  {
    // create array which holds information about markers on the map
    if (map._currentMarkers === undefined)
    {
      map._currentMarkers = [];
    }
    var selMode = params['selMode'];
    var dataLayerId = params['dataLayerId'];
    var selected = params['selected'];
    var action = params['action'];
    var tooltip = '';
    if (params['tooltip'])
      tooltip = params['tooltip'];

    var sourceImg;
    if (selected)
    {
      sourceImg = __getMarkerIcon(params['sourceSelected'], params);
    }
    else
    {
      sourceImg = __getMarkerIcon(params['source'], params);
    }

    // in test mode create real markers and not
    // optimized one
    var testMode = (amx && amx.testmode === true);

    var marker = new google.maps.Marker(
    {
      opacity : params['opacity'],
      position : markerLatLng,
      optimized: !testMode,
      icon : sourceImg,
      title : tooltip
    });

    marker.label = params['label'];
    marker.labelStyle = params['labelStyle'];
    marker.labelPosition = params['labelPosition'];

    if (animation == 'auto')
      marker.setAnimation(google.maps.Animation.DROP);

    // Add marker to the map
    marker.setMap(gmap);
    // add information that map contains marker
    map._currentMarkers.push(marker);

    // attach selection related event listeners
    if (selMode == DvtGeographicMapRenderer.SEL_SINGLE || selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
    {
      if (!amx.hasTouch())
      {
        // bug 18113730: do not register hover listeners on touch devices
        DvtGeographicMapRenderer.attachGMapEventListener(map, marker, DvtGeographicMapRenderer.MOUSE_OVER, params);
        DvtGeographicMapRenderer.attachGMapEventListener(map, marker, DvtGeographicMapRenderer.MOUSE_OUT, params);
      }
      DvtGeographicMapRenderer.attachGMapEventListener(map, marker, DvtGeographicMapRenderer.CLICK, params);

      if (selected)
      {
        var selection = map['selection'][dataLayerId];
        if (selection === undefined)
        {
          selection = map['selection'][dataLayerId] = [];
        }
        marker['selected'] = true;
        marker['rowKey'] = params['rowKey'];
        marker['dataLayerId'] = dataLayerId;
        selection.push(marker);
      }
    }

    if (action)
    {
      var listener = function (event)
      {
        var actionEvent = new DvtMapActionEvent(params['clientId'], params['rowKey'], action);
        actionEvent.addParam('dataLayerId', params['dataLayerId']);
        actionEvent.addParam('actionType', event.data.type);
        var markerPos = marker.getPosition();
        var pointXY = fromLatLngToPixel(gmap, markerPos);

        actionEvent.addParam('pointXY', 
        {
          'x' : pointXY.x, 'y' : pointXY.y
        });
        actionEvent.addParam('latLng', 
        {
          'lat' : markerPos.lat(), 'lng' : markerPos.lng()
        });
        map.__dispatchEvent(actionEvent);
      };

      var registrator = function(start, stop, cancel)
      {
        google.maps.event.addListener(marker, "mousedown", start);
        google.maps.event.addListener(marker, "mouseup", stop);
        google.maps.event.addListener(marker, "mouseout", cancel);
      };

      _addTapHoldEventListener(marker, registrator, listener);
    }
  };

  var fromLatLngToPixel = function (gmap, position)
  {
    var scale = Math.pow(2, gmap.getZoom());
    var proj = gmap.getProjection();
    var bounds = gmap.getBounds();
    var nw = proj.fromLatLngToPoint(new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()));
    var point = proj.fromLatLngToPoint(position);

    return new google.maps.Point(Math.floor((point.x - nw.x) * scale), Math.floor((point.y - nw.y) * scale));
  };

  /**
   * Attach event listeners
   * @param {DvtGeographicMap} map The geographic map being rendered.
   * @param {object} marker The marker
   * @param {string} eventType The event type
   * @param {object} params The params for the point
   */
  DvtGeographicMapRenderer.attachGMapEventListener = function (map, marker, eventType, params)
  {
    switch (eventType)
    {
      case DvtGeographicMapRenderer.MOUSE_OVER:
        google.maps.event.addListener(marker, DvtGeographicMapRenderer.MOUSE_OVER, function ()
        {
          if (!marker.selected)
          {
            marker.setIcon(__getMarkerIcon(params['sourceHover'], params));
          }
          else
          {
            marker.setIcon(__getMarkerIcon(params['sourceHoverSelected'], params));
          }
        });
        break;
      case DvtGeographicMapRenderer.MOUSE_OUT:
        google.maps.event.addListener(marker, DvtGeographicMapRenderer.MOUSE_OUT, function ()
        {
          if (!marker.selected)
          {
            marker.setIcon(__getMarkerIcon(params['source'], params));
          }
        });
        break;
      case DvtGeographicMapRenderer.CLICK:
        google.maps.event.addListener(marker, DvtGeographicMapRenderer.CLICK, function ()
        {
          var id = params['dataLayerId'];
          var i;
          if (!map.selection[id])
            map.selection[id] = [];
          var selMode = params['selMode'];
          if (!marker.selected)
          {
            var selection = map.selection[id];
            if (selMode == DvtGeographicMapRenderer.SEL_SINGLE)
            {
              if (selection.length != 0)
              {
                for (i = 0;i < selection.length;i++)
                {
                  selection[i].setIcon(__getMarkerIcon(params['source'], params));
                  selection[i].selected = false;
                }
                map.selection[id] = [];
              }
            }
            marker.setIcon(__getMarkerIcon(params['sourceSelected'], params));
            marker.selected = true;
            marker.rowKey = params['rowKey'];
            marker.dataLayerId = id;
            map.selection[id].push(marker);
          }
          else
          {
            // deselect
            marker.setIcon(__getMarkerIcon(params['source'], params));
            marker.selected = false;
            // remove from selection
            if (selMode == DvtGeographicMapRenderer.SEL_SINGLE)
            {
              map.selection[id] = [];
            }
            else if (selMode == DvtGeographicMapRenderer.SEL_MULTIPLE)
            {
              for (i = 0;i < map.selection[id].length;i++)
              {

                if (marker.rowKey == map.selection[id][i].rowKey && marker.dataLayerId == map.selection[id][i].dataLayerId)
                {
                  map.selection[id].splice(i, 1);
                  break;
                }
              }
            }
          }
          var evt = new DvtGeoMapSelectionEvent(map.selection[id]);
          evt.addParam('dataLayerId', id);
          map.__dispatchEvent(evt);
        });
        break;
      default :
        break;
    }
  };

  /**
   * Zoom to a single marker
   * @param {object} gmap the Google map
   * @param {object} markerLatLng the LatLng google maps object
   * @param {number} zoomLevel the zoom level (optional)
   */
  DvtGeographicMapRenderer.zoomToMarker = function (gmap, markerLatLng, zoomLevel)
  {
    gmap.setCenter(markerLatLng);
    if (zoomLevel)
      gmap.setZoom(zoomLevel);
  };

  /**
   * Get the params for the point
   *
   * @param {object} point The data object
   * @param {string} mapProvider The map provider id
   * @return {object} params The params for the point
   */
  DvtGeographicMapRenderer.getParams = function (point, mapProvider)
  {
    var tooltip = DvtGeographicMapRenderer.getTooltip(point);
    var source = DvtGeographicMapRenderer.getSource(point, mapProvider);
    var sourceHover = DvtGeographicMapRenderer.getSourceHover(point, mapProvider);
    var sourceSelected = DvtGeographicMapRenderer.getSourceSelected(point, mapProvider);
    var sourceHoverSelected = DvtGeographicMapRenderer.getSourceHoverSelected(point, mapProvider);
    var rowKey = point['_rowKey'];
    var clientId = point['clientId'];
    var params = {};

    params['label'] = point['label'];
    params['labelPosition'] = point['labelPosition'];
    params['labelStyle'] = point['labelStyle'];
    params['width'] = point['width'] || 32;
    params['height'] = point['height'] || 32;
    params['scaleX'] = point['scaleX'] || 1;
    params['scaleY'] = point['scaleY'] || 1;
    params['rotation'] = point['rotation'] || 0;
    params['opacity'] = point['opacity'] || 1;
    params['source'] = source;
    params['sourceHover'] = sourceHover;
    params['sourceSelected'] = sourceSelected;
    params['sourceHoverSelected'] = sourceHoverSelected;
    params['tooltip'] = tooltip;
    if (point['action'])
      params['action'] = point['action'];
    params['rowKey'] = rowKey;
    params['clientId'] = clientId;
    return params;
  };

  /**
   * Get dataSelection mode
   * @param {object} dataLayer The dataLayer
   * @return {string} The selection mode
   */
  DvtGeographicMapRenderer.getSelMode = function (dataLayer)
  {
    var selMode = DvtGeographicMapRenderer.SEL_NONE;
    if (dataLayer['dataSelection'])
      selMode = dataLayer['dataSelection'];

    return selMode;
  };

  /**
   * Get marker tooltip
   * @param {object} point
   * @return {string} The tooltip
   */
  DvtGeographicMapRenderer.getTooltip = function (point)
  {
    var tooltip = null;
    if (point['shortDesc'])
      tooltip = point['shortDesc'];
    return tooltip;
  };

  /**
   * Get marker source URL
   * @param {object} point
   * @param {string} mapProvider The map provider
   * @return {string} The source URL
   */
  DvtGeographicMapRenderer.getSource = function (point, mapProvider)
  {
    var source;
    if (point['source'])
      source = point['source'];
    else
    {
      if (mapProvider == DvtGeographicMap.MAP_PROVIDER_ORACLE)
      {
        source = DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_IMG;
      }
      else if (mapProvider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      {
        source = DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_IMG;
      }
    }
    return source;
  };

  /**
   * Get marker sourceSelected URL
   * @param {object} point
   * @param {string} mapProvider The map provider
   * @return {string} The sourceSelected URL
   */
  DvtGeographicMapRenderer.getSourceSelected = function (point, mapProvider)
  {
    var sourceSelected;
    if (point['sourceSelected'])
      sourceSelected = point['sourceSelected'];
    else
    {
      if (mapProvider == DvtGeographicMap.MAP_PROVIDER_ORACLE)
      {
        sourceSelected = DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_SELECT_IMG;
      }
      else if (mapProvider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      {
        sourceSelected = DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_SELECT_IMG;
      }
    }
    return sourceSelected;
  };

  /**
   * Get marker sourceHover URL
   * @param {object} point
   * @param {string} mapProvider The map provider
   * @return {string} The sourceHover URL
   */
  DvtGeographicMapRenderer.getSourceHover = function (point, mapProvider)
  {
    var sourceHover;
    if (point['sourceHover'])
      sourceHover = point['sourceHover'];
    else
    {
      if (mapProvider == DvtGeographicMap.MAP_PROVIDER_ORACLE)
      {
        sourceHover = DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_HOVER_IMG;
      }
      else if (mapProvider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      {
        sourceHover = DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_HOVER_IMG;
      }
    }
    return sourceHover;
  };

  /**
   * Get marker sourceHoverSelected URL
   * @param {object} point
   * @param {string} mapProvider The map provider
   * @return {string} The sourceHoverSelected URL
   */
  DvtGeographicMapRenderer.getSourceHoverSelected = function (point, mapProvider)
  {
    var sourceHoverSelected;
    if (point['sourceHoverSelected'])
      sourceHoverSelected = point['sourceHoverSelected'];
    else
    {
      if (mapProvider == DvtGeographicMap.MAP_PROVIDER_ORACLE)
      {
        sourceHoverSelected = DvtGeographicMapRenderer.DEFAULT_ORACLE_MARKER_SELECT_IMG;
      }
      else if (mapProvider == DvtGeographicMap.MAP_PROVIDER_GOOGLE)
      {
        sourceHoverSelected = DvtGeographicMapRenderer.DEFAULT_GOOGLE_MARKER_SELECT_IMG;
      }
    }
    return sourceHoverSelected;
  };

  /**
   * Get minimum number
   * @param {number} min
   * @param {number} n
   * @return {number} min
   */
  DvtGeographicMapRenderer.getMin = function (min, n)
  {
    if (min == null || min > n)
      min = n;
    return min;
  };

  /**
   * Get maximum number
   * @param {number} max
   * @param {number} n
   * @return {number} max
   */
  DvtGeographicMapRenderer.getMax = function (max, n)
  {
    if (max == null || max < n)
      max = n;
    return max;
  };

  /**
   * If selection is enabled, returns the initial selection status for a data layer.
   * On first render, returns array of row keys found in the 'selectedRowKeys' property.
   * On re-render, returns the previously selected row keys
   * @private
   * @param {object} map
   * @param {object} dataLayer
   * @param {string} id dataLayer id
   * @return {array} array of selected row keys
   */
  DvtGeographicMapRenderer._getSelectedRowKeys = function (map, dataLayer, id)
  {
    var selMode = DvtGeographicMapRenderer.getSelMode(dataLayer);
    var selectedRowKeys = [];

    // if data selection is off, nothing to do
    if (selMode === DvtGeographicMapRenderer.SEL_SINGLE || selMode === DvtGeographicMapRenderer.SEL_MULTIPLE)
    {
      // first time through, check if there's an initial selection to be set
      if (!map.initialSelectionApplied)
      {
        if (dataLayer['selectedRowKeys'] !== undefined)
        {
          selectedRowKeys = dataLayer['selectedRowKeys'].split(' ');
        }
      }
      else // next time, preserve existing selections
      {
        var selection = map['selection'][id];// selected points for this layer
        if (selection)
        {
          for (var i = 0;i < selection.length;i++)
          {
            selectedRowKeys.push(selection[i]['rowKey']);
          }
          // clear the previous selection as we'll populate a new one
          selection.length = 0;
        }
      }
    }
    return selectedRowKeys;
  };

  /**
   * Checks if the map includes any data layers.
   * @private
   * @param {object} map DvtGeographicMap instance
   * @return {boolean} true if the map includes any data layers, false otherwise
   */
  DvtGeographicMapRenderer._mapIncludesData = function (map)
  {
    var data = map['Data'];

    if (data && data['routes'] && data['routes'].length > 0)
      return true;

    if (!data || !data['dataLayers'] || data['dataLayers'].length == 0)
      return false;

    return true;
  };

  /**
   * Loads javascript by url.
   * @param {string} url javascript url to load
   * @param {object} success callback called on success
   * @param {object} failure callback called on failure
   */
  DvtGeographicMapRenderer.loadJS = function (url, success, failure)
  {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.async = false;
    script.onload = success;
    script.onerror = failure;
    head.appendChild(script);
  };

  /**
   * Map action event.
   * @param {string} [clientId] The client id associated with this action event.
   * @param {string} [rowKey] The rowKey for the object associated with this event.
   * @param {string} [action] The action name.
   * @class
   * @constructor
   * @export
   */
  var DvtMapActionEvent = function (clientId, rowKey, action)
  {
    this.Init(DvtMapActionEvent.TYPE);
    this._clientId = clientId;
    this._rowKey = rowKey;
    this._action = action;
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtMapActionEvent, DvtBaseComponentEvent, 'DvtMapActionEvent', 'PRIVATE');
  /**
   * @export
   */
  DvtMapActionEvent.TYPE = 'action';

  /**
   * Returns the clientId associated with this event.
   * @return {string} clientId.
   * @export
   */
  DvtMapActionEvent.prototype.getClientId = function ()
  {
    return this._clientId;
  };

  /**
   * A component level selection event.
   * @param {array} selection The array of currently selected ids for the component.
   * @class
   * @constructor
   * @export
   */
  var DvtGeoMapSelectionEvent = function (selection)
  {
    this.Init(selection);
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtGeoMapSelectionEvent, DvtBaseComponentEvent, 'DvtGeoMapSelectionEvent');

  /**
   * @export
   */
  DvtGeoMapSelectionEvent.TYPE = 'selection';

  /**
   * @param {array} selection The array of currently selected ids for the component.
   * @param {string} [type] DvtGeoMapSelectionEvent.TYPE if none specified.
   * @override
   */
  DvtGeoMapSelectionEvent.prototype.Init = function (selection, type)
  {
    DvtGeoMapSelectionEvent.superclass.Init.call(this, type ? type : DvtGeoMapSelectionEvent.TYPE);
    this._selection = selection;
  };

  /**
   * Returns the array of currently selected ids for the component.
   * @return {array} The array of currently selected ids for the component.
   * @export
   */
  DvtGeoMapSelectionEvent.prototype.getSelection = function ()
  {
    return this._selection;
  };

  /**
   * Returns the rowKey of the object associated with this event.
   * @return {string} rowKey.
   * @export
   */
  DvtMapActionEvent.prototype.getRowKey = function ()
  {
    return this._rowKey;
  };

  /**
   * Returns the action name.
   * @return {string} action.
   * @export
   */
  DvtMapActionEvent.prototype.getAction = function ()
  {
    return this._action;
  };

  /**
   * Map bounds change event.
   * @param {number} [minX] minimum x bounds coordinate (longitude).
   * @param {number} [minY] minimum y bounds coordinate (latitude).
   * @param {number} [maxX] maximum x bounds coordinate (longitude).
   * @param {number} [maxY] maximum y bounds coordinate (latitude).
   * @param {number} [centerX] x coordinate (longitude) of map center.
   * @param {number} [centerY] y coordinate (latitude) of map center.
   * @param {number} [zoomLevel] zoom level.
   * @class
   * @constructor
   * @export
   */
  var DvtMapBoundsChangeEvent = function (minX, minY, maxX, maxY, centerX, centerY, zoomLevel)
  {
    this.Init(DvtMapBoundsChangeEvent.TYPE);
    this._minX = minX;
    this._minY = minY;
    this._maxX = maxX;
    this._maxY = maxY;
    this._centerX = centerX;
    this._centerY = centerY;
    this._zoomLevel = zoomLevel;
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtMapBoundsChangeEvent, DvtBaseComponentEvent, 'DvtMapBoundsChangeEvent', 'PRIVATE');

  /**
   * @export
   */
  DvtMapBoundsChangeEvent.TYPE = 'mapboundschange';

  /**
   * Returns minimum x bounds coordinate (longitude).
   * @return {number} minX
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getMinX = function ()
  {
    return this._minX;
  };

  /**
   * Returns minimum y bounds coordinate (latitude).
   * @return {number} minY
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getMinY = function ()
  {
    return this._minY;
  };

  /**
   * Returns maximum x bounds coordinate (longitude).
   * @return {number} maxX
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getMaxX = function ()
  {
    return this._maxX;
  };

  /**
   * Returns maximum y bounds coordinate (latitude).
   * @return {number} maxY
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getMaxY = function ()
  {
    return this._maxY;
  };

  /**
   * Returns x coordinate (longitude) of map center.
   * @return {number} centerX
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getCenterX = function ()
  {
    return this._centerX;
  };

  /**
   * Returns y coordinate (latitude) of map center.
   * @return {number} centerY
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getCenterY = function ()
  {
    return this._centerY;
  };

  /**
   * Returns current zoom level.
   * @return {number} zoomLevel
   * @export
   */
  DvtMapBoundsChangeEvent.prototype.getZoomLevel = function ()
  {
    return this._zoomLevel;
  };

  /**
   * Map input event.
   * @param {string} [eventId] input event type id (e.g. mousedown, mouseup, click)
   * @param {number} [pointX] x coordinate (longitude) of the event.
   * @param {number} [pointY] y coordinate (latitude) of the event.
   * @class
   * @constructor
   * @export
   */
  var DvtMapInputEvent = function (eventId, pointX, pointY)
  {
    this.Init(DvtMapInputEvent.TYPE);
    this._eventId = eventId;
    this._pointX = pointX;
    this._pointY = pointY;
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(DvtMapInputEvent, DvtBaseComponentEvent, 'DvtMapInputEvent', 'PRIVATE');

  /**
   * @export
   */
  DvtMapInputEvent.TYPE = 'mapinput';

  /**
   * Returns the event type id -- mousedown, mouseup, or click.
   * @return {string} eventId
   * @export
   */
  DvtMapInputEvent.prototype.getEventId = function ()
  {
    return this._eventId;
  };

  /**
   * Returns x coordinate (longitude).
   * @return {number} pointX
   * @export
   */
  DvtMapInputEvent.prototype.getPointX = function ()
  {
    return this._pointX;
  };

  /**
   * Returns y coordinate (latitude).
   * @return {number} pointY
   * @export
   */
  DvtMapInputEvent.prototype.getPointY = function ()
  {
    return this._pointY;
  };
})();
