import {
  Menu,
  MenuItem,
  Box,
  TextField,
  Autocomplete,
} from "@mui/material";
import { useMediaQuery } from "@mui/material";
import {
  DensityMedium,
  ArrowBackIosRounded,
  ArrowForwardIosRounded,
  LocationOnRounded,
  KeyboardArrowDownRounded,
} from "@mui/icons-material";

import "./App.css";
import { useState, useEffect} from "react";
import axios from "axios";
import * as d3 from "d3";

const VISUAL_CROSSING_API_KEY = "JBLXS7EUX8F2U9QFW3VTVQ5P2";
const VISUAL_CROSSING_API_URL =
  "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/";


export default function App() {
  // used for web-responsive layout design
  const isMobile = useMediaQuery("(max-width:600px)");
  const [anchorElem, setAnchorElem] = useState(null);

  // state for inputs
  const [location, setLocation] = useState("Toronto");
  const [day, setDay] = useState(new Date());
  const [timeRange, setTimeRange] = useState("Morning");
  const [hourlyData, setHourlyData] = useState([]);
  const [nextHourlyData, setNextHourlyData] = useState([]);
  const [error, setError] = useState("");
  const [displayValues, setDisplayValues] = useState({
    date1: {
      windSpeed: 0,
      temperature: 0,
      precipProb: 0,
      precipType: 'precipitation',
      conditions: '',
      icon: ''
    },
    date2: {
      windSpeed: 0,
      temperature: 0,
      precipProb: 0,
      precipType: 'precipitation',
      conditions: '',
      icon: ''
    }
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  
  const timeRanges = {
    Morning: { start: 8, end: 12 },
    Afternoon: { start: 12, end: 17 },
    Evening: { start: 17, end: 21 },
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month}-${day}`;
  };

  // get data
  const getData = async () => {
    if (!location) {
      setError("please enter a valid location");
    }
    try {
      const nextDate = new Date(day);
      nextDate.setDate(nextDate.getDate() + 7);

      const response = await axios.get(
        `${VISUAL_CROSSING_API_URL}/${location}/${formatDate(day)}/${formatDate(nextDate)}?key=${VISUAL_CROSSING_API_KEY}`
      );
      const weatherData = response.data;
      if (weatherData && weatherData.days && weatherData.days[0] && weatherData.days[0].hours) {
        setHourlyData(weatherData.days[0].hours);
        setNextHourlyData(weatherData.days[7]?.hours || []);
      } else {
        setError("No hourly data available");
      }
    } catch (error) {
      setError(error);
    }
  };

  useEffect(()=> {
      getData();
  }, [day]);

  useEffect(() => {

    if (hourlyData.length > 0) {
      drawGraph(hourlyData, "start-graph");
      getDisplayValues(hourlyData, "date1");
    }
    if (nextHourlyData.length > 0) {
      drawGraph(nextHourlyData, "next-graph");
      getDisplayValues(nextHourlyData, "date2");
    }
  }, [hourlyData, nextHourlyData, timeRange]);

  const drawGraph = (data, svgId) => {
    const svg = d3.select(`#${svgId}`);
    if (svg.empty()) return;
    svg.selectAll("*").remove();

    const width = svg.node().parentNode.clientWidth;
    const height = svg.node().parentNode.clientHeight - 60;

    const margin = { top: 20, right: 30, bottom: 50, left: 40 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const parseTime = d3.timeParse("%H:%M:%S");

    const x = d3.scaleTime()
      .domain([
        parseTime(`${String(timeRanges[timeRange].start - 2).padStart(2, "0")}:00:00`), 
        parseTime(`${String(timeRanges[timeRange].end + 2).padStart(2, "0")}:00:00`)
      ]) 
      .range([0, graphWidth])
      .nice();

    const y = d3.scaleLinear()
      .domain([
        Math.min(d3.min(data, (d) => d.temp), d3.min(data, (d) => d.feelslike)), 
        Math.max(d3.max(data, (d) => d.temp), d3.max(data, (d) => d.feelslike))  
      ])
      .nice()
      .range([graphHeight, 0]);

    const tempLine = d3.line()
      .x((d) => x(parseTime(d.datetime)))
      .y((d) => y(d.temp))
      .curve(d3.curveCardinal);

    const feelsLikeLine = d3.line()
      .x((d) => x(parseTime(d.datetime)))
      .y((d) => y(d.feelslike))
      .curve(d3.curveCardinal);


    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // time units for start/end of time range
    const startLine = `${String(timeRanges[timeRange].start).padStart(2, "0")}:00:00`;
    const endLine = `${String(timeRanges[timeRange].end).padStart(2, "0")}:00:00`;

    g.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", graphWidth)
      .attr("height", graphHeight);

    // add temp and feelslike lines
    g.append("path")
      .data([data])
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr("d", tempLine)
      .attr("clip-path", "url(#clip)");

    g.append("path")
      .data([data])
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "firebrick")
      .attr("stroke-width", 3)
      .attr("d", feelsLikeLine)
      .attr("clip-path", "url(#clip)");

    // add data points
    g.selectAll(".temp-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "temp-point")
      .attr("cx", (d) => x(parseTime(d.datetime)))
      .attr("cy", (d) => y(d.temp))
      .attr("r", 3)
      .attr("fill", "steelblue");

    g.selectAll(".feelslike-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "feelslike-point")
      .attr("cx", (d) => x(parseTime(d.datetime)))
      .attr("cy", (d) => y(d.feelslike))
      .attr("r", 3)
      .attr("fill", "firebrick");

    // add dotted vertical lines to mark edges of time interval
    g.append("line")
      .attr("x1", x(parseTime(startLine)))
      .attr("y1", 0)
      .attr("x2", x(parseTime(startLine)))
      .attr("y2", graphHeight)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
        
    g.append("line")
      .attr("x1", x(parseTime(endLine)))
      .attr("y1", 0)
      .attr("x2", x(parseTime(endLine)))
      .attr("y2", graphHeight)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
    
    // add y = 0 dotted line (more important if we add a celsius function)
    g.append("line")
      .attr("x1", 0) 
      .attr("y1", y(0))
      .attr("x2", graphWidth) 
      .attr("y2", y(0)) 
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4"); 

    // add x axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${graphHeight})`)
      .call(d3.axisBottom(x).ticks(d3.timeHour.every(1)).tickFormat(d3.timeFormat("%I %p")));

    g.append("text")
      .attr("class", "x-axis-title")
      .attr("x", graphWidth / 2)  
      .attr("y", graphHeight + 50) 
      .attr("text-anchor", "middle") 
      .attr("font-size", "18px") 
      .text(timeRange);
  }

  const getDisplayValues = (data, dateKey) => {
      // finds averages / modes for weather data concerning the time range selected

    const dataInRange = data.filter((d, ind)=> ind >= timeRanges[timeRange].start && ind <= timeRanges[timeRange].end)
    const windSpeed = Math.floor(dataInRange.map(d => d.windspeed)
      .reduce((acc, val) => acc + val, 0) /dataInRange.length);
    const temperature = Math.floor(dataInRange.map(d => d.temp)
      .reduce((acc, val) => acc + val, 0) /dataInRange.length);
    const precipProb = Math.floor(dataInRange.map(d=> d.precipprob)
      .reduce((acc, val) => acc + val, 0) /dataInRange.length);
    const preciptypeValues = dataInRange.map(d=>d.preciptype)
      .filter(val => val !== null)
      .reduce((acc, val) => {
        acc[val] = (acc[val]|| 0) + 1;
        return acc
      }, {});
    const conditionValues = dataInRange.map(d=>d.conditions)
      .reduce((acc, val) => {
        if(val === null) return acc;
        acc[val] = (acc[val]|| 0) + 1;
        return acc
      }, {});
    const iconValues = dataInRange.map(d=>d.icon)
      .reduce((acc, val) => {
        if(val === null) return acc;
        acc[val] = (acc[val]|| 0) + 1;
        return acc
      }, {});
  
    const precipType = Object.keys(preciptypeValues).length > 0 
    ? Object.keys(preciptypeValues).reduce((a, b) => preciptypeValues[a] >= preciptypeValues[b] ? a : b)
    : "precipitation";
    const conditions = Object.keys(conditionValues).reduce((a,b) => conditionValues[a] >= conditionValues[b] ? a : b, "clear");
    const icon = Object.keys(iconValues).length > 0 
    ? Object.keys(iconValues).reduce((a, b) => iconValues[a] >= iconValues[b] ? a : b)
    : "clear-day";

    setDisplayValues((prevValues) => ({
      ...prevValues,
      [dateKey]: {
        windSpeed,
        temperature,
        precipProb,
        precipType,
        conditions,
        icon
      }
    }));
  }

  // for menu in mobile layout
  const handleMenuClick = (e) => {
    setAnchorElem(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorElem(null);
  };

  const handleDayChange = (event, val) => {
    const today = new Date();
    const todayInd = today.getDay();
    const daySelectedInd = dayNames.indexOf(val);

    let  diff = daySelectedInd - todayInd;
    if (diff <= 0){
      diff += 7;
    }

    const newDay = new Date(today);
    newDay.setDate(today.getDate() + diff);
    setDay(newDay);
  }

  return (
    <div className="app">
      {/* logo, settings */}
      <div className="top-bar flex-row no-margin space-btwn-h">
        <h3 className="app-name">whether.io</h3>
        {isMobile ? (
          <div className="settings">
            <button onClick={handleMenuClick}>
              <DensityMedium />
            </button>
            <Menu
              anchorEl={anchorElem}
              open={Boolean(anchorElem)}
              onClose={handleMenuClose}
            >
              <MenuItem>help</MenuItem>
              <MenuItem>sign out</MenuItem>
            </Menu>
          </div>
        ) : (
          <div>
            <button>help</button>
            <button>sign out</button>
          </div>
        )}
      </div>

      {/* full page */}
      <div className="page-content flex-row no-margin space-btwn-h">
        {/* back arrow */}
        {/* <button className="arrow">
          <ArrowBackIosRounded />
        </button> */}

        {/* main content */}
        <div className="flex-col center full-wh">
          <div
            className={
              isMobile ? "input-container flex-row no-margin space-btwn-h mobile-view" : "flex-row no-margin space-btwn-h input-container"
            }
          >
            <Box
              sx={{ display: "flex", alignItems: "flex-end", width: "100%" }}
            >
              <LocationOnRounded
                sx={{ color: "action.active", mr: 1, my: 0.5 }}
              />
              <TextField
                id="location-input"
                variant="standard"
                value={location || ""}
                label={null}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    getData();
                  }
                }}
                sx={{
                  "& .MuiInput-underline:before": { borderBottom: "none" },
                  width: "100%",
                }}
              />
            </Box>
            {error ? (<p>{error}</p>): null}
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
              <Autocomplete
                id="day-input"
                autoSelect
                disableClearable
                options={dayNames}
                size="small"
                sx={{ minWidth: 120, flexGrow: 0 }}
                popupIcon={<KeyboardArrowDownRounded />}
                value={dayNames[day.getDay()]}
                onChange={handleDayChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={null}
                    variant="standard"
                    sx={{
                      "& .MuiInput-underline:before": { borderBottom: "none" },
                    }}
                  />
                )}
              />
              <Autocomplete
                id="time-range-input"
                autoSelect
                disableClearable
                size="small"
                options={["Morning", "Afternoon", "Evening"]}
                sx={{ minWidth: 120, flexGrow: 0 }}
                popupIcon={<KeyboardArrowDownRounded />}
                value={timeRange}
                onChange={(event, newValue) => setTimeRange(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={null}
                    variant="standard"
                    sx={{
                      "& .MuiInput-underline:before": { borderBottom: "none" },
                    }}
                  />
                )}
              />
            </Box>
          </div>
          <hr />
          <div id={isMobile ? "output-container mobile-view" : "output-container"}>
            <div className="display-container">
              <h1 className="sub-header">This {dayNames[day.getDay()]} the {day.getDate()}</h1>
              <div className="flex-row center gap-20">
                <img className="icon" src={`/icons/${displayValues["date1"].icon}.png`} alt="weathericon" />
                <div className="flex-col no-margin flex-start">
                  <p className="medium-text">{displayValues["date1"].conditions}, {displayValues["date1"].temperature}&deg;F</p>
                  <p className="small-text">winds: {displayValues["date1"].windSpeed} mph</p>
                  <p className="small-text">{displayValues["date1"].precipProb} % chance of {displayValues["date1"].precipType}</p>
                </div>
              </div>
              <div className="graph-container">
                <svg id="start-graph" width="100%" height="100%"></svg>
              </div>
            </div>
            <div className="display-container">
              <h1 className="sub-header">Next {dayNames[day.getDay()]} the {new Date(new Date(day).setDate(new Date(day).getDate() + 7)).getDate()}</h1>
              <div className="flex-row center gap-20">
                <img className="icon" src={`/icons/${displayValues["date2"].icon}.png`} alt="weathericon" />
                <div className="flex-col no-margin flex-start">
                  <p className="medium-text">{displayValues["date2"].conditions}, {displayValues["date2"].temperature}&deg;F</p>
                  <p className="small-text">winds: {displayValues["date2"].windSpeed} mph</p>
                  <p className="small-text">{displayValues["date2"].precipProb} % chance of {displayValues["date2"].precipType}</p>
                </div>
              </div>
              <div className="graph-container">
                <svg id="next-graph" width="100%" height="100%"></svg>
              </div>
            </div>
          </div>
        </div>

        {/* next arrow
        <button className="arrow">
          <ArrowForwardIosRounded />
        </button> */}
      </div>
    </div>
  );
}
