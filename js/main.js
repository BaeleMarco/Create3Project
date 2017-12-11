$(document).ready(function(){
    const formStation = {
        default: 'form[name=search]',
        select: 'form[name=search] select[name=stations]',
        direction: 'form[name=search] p#toggle',
        button: 'form[name=search] button[type=submit]'
    };
    const displayedData = {
        default: 'div#data',
        totalDelay: 'div.information div#totalDelay span',
        totalCancelled: 'div.information div#totalCancelled span',
        averageDelay: 'div.information div#averageDelay span',
        loading: 'div.loading'
    };
    let stations;
    let type = "departure";
    let delayInMinutes = 0;
    let cancelled = 0;
    let rotation = 0;

    function disableButton(who, isDisabled){
        $(who).attr('disabled', isDisabled);
    }

    function calculateDelay(scheduled, estimated, status) {
        if(scheduled != estimated) {
            switch (status) {
                // case "EXP": //On time
                // case "ARR_ELY": //Landed early
                // case "ARR": //Landed
                // case "CNL":
                // case "DIV":
                //     return "";
                case "ARR_DLY": //Landed delayed
                case "EXP_DLY":
                    let first = scheduled.split(":");
                    let second = estimated.split(":");
                    let hourDifference = second[0] - first[0];
                    let minutesDifference = second[1] - first[1];
                    if(hourDifference < 0) {
                        hourDifference += 24;
                    }
                    if(hourDifference != 0 && minutesDifference < 0) {
                        minutesDifference += 60;
                        hourDifference -= 1;
                    }
                    // console.log(scheduled + " " + estimated + " Hours:" + hourDifference + ", Minutes:" + minutesDifference);
                    delayInMinutes += 60*hourDifference;
                    delayInMinutes += minutesDifference;

                    if(minutesDifference > 0){
                        if(minutesDifference < 10){
                            minutesDifference = "0" + minutesDifference;
                        }
                        return "<span class='delay'> + " + hourDifference + ":" + minutesDifference + "</span>";
                    }
            }
        }
        return "";
    }

    function addStationOptions(data) {
        let options = "";
        $.each(data, function(index, value) {
            options += "<option value='" + index + "'>" + value.name + "</option>";
        });
        let html = $(formStation.select).html();
        $(formStation.select).html(html + options);
    }

    function getNormalDate(date) {
        let dates = date.split("T");
        dates[0] = dates[0].split("-");
        return dates[1].slice(0, -4) + " " + dates[0][2] + "-" + dates[0][1] + "-" + dates[0][0];
    }

    function addStationData(data) {
        let response = "";
        if(data.size === 0) {
            response = "<p style='padding-left:20px;'>No flights found.</p>";
        }else{
            response += "<div class='information'>" +
                "<div>Total flights: " + data.size + "</div>" +
                "<div id='totalCancelled'>Cancelled fights: <span></span></div>" +
                "<div id='totalDelay'>Total delay: <span>0</span></div>" +
                "<div id='averageDelay'>Average delay: <span></span></div>" +
                "<div>Last updated: " + getNormalDate(data.lastUpdated) + "</div>" +
                "</div>";
            response += "<table class='flights'>";
            response += "<tr>" +
                "<th class='dataFlightNr'>Flight number</th>";
            if ($(window).width() < 900 && type == "arrival") {
                response += "<th class='dataDepAir'>Departure airport</th>";
            }
            if ($(window).width() < 900 && type == "departure") {
                response += "<th class='dataArrAir'>Arrival airport</th>";
            }
            response += "<th class='dataDepTime'>Departure Time</th>" +
                "<th class='dataArrTime'>Arrival Time</th>" +
                "<th class='dataStatus'>Status message</th>" +
            "</tr>";
            data.flights.forEach(function(flight){
                if((flight.status.code == "CNL" || flight.status.code == "DIV") && flight.status.detailedMessage === null){
                    flight.status.detailedMessage = "No details about delay found.";
                }
                response += "<tr>" +
                    "<td class='dataFlightNr'>" + flight.number + "</td>";
                if ($(window).width() < 900 && type == "arrival") {
                    response += "<td class='dataDepAir'>" + flight.departureAirport.name + "</td>";
                }
                if ($(window).width() < 900 && type == "departure") {
                    response += "<td class='dataArrAir'>" + flight.arrivalAirport.name + "</td>";
                }
                response += "<td class='dataDepTime'>" + flight.departureTime.scheduled + calculateDelay(flight.departureTime.scheduled, flight.departureTime.estimated, flight.status.code) + "</td>" +
                    "<td class='dataArrTime'>" + flight.arrivalTime.scheduled + calculateDelay(flight.arrivalTime.scheduled, flight.arrivalTime.estimated, flight.status.code) + "</td>";
                    response += "<td class='dataStatus'>";
                    switch(flight.status.code) {
                        case "EXP": //On time
                            response += "Not landed";
                            break;
                        case "EXP_ELY": //Ahead of time
                            response += "<span class='onTime'>Not landed</span>";
                            break;
                        case "ARR": //Landed
                        case "ARR_ELY": //Landed early
                            response += "Landed";
                            break;
                        case "ARR_DLY": //Landed delayed
                            response += "<span class='delay'>Landed</span>";
                            break;
                        case "EXP_DLY": //Not on time
                            response += "<span class='delay'>Not landed</span>";
                            break;
                        case "DIV": //Diverted
                            response += "<span class='delay'>Diverted</span>" +
                                "</td>" +
                                "</tr>" +
                                "<tr><td class='detailedMessage' colspan='6'>" + flight.status.detailedMessage + "</td></tr>";
                            break;
                        case "CNL": //Cancelled
                            cancelled += 1;
                            response += "<span class='cancelled'>Cancelled</span>" +
                                "</td>" +
                                "</tr>" +
                                "<tr><td class='detailedMessage' colspan='6'>" + flight.status.detailedMessage + "</td></tr>";
                            break;
                    }
                response += "</td></tr>";
            });
            response += "</table>";
            $(displayedData.totalDelay).html(getDelay(delayInMinutes));
            $(displayedData.averageDelay).html(getDelay(delayInMinutes / data.size));
        }
        $(displayedData.loading).hide();
        $(displayedData.default).html(response);
        $(displayedData.totalDelay).html(getDelay(delayInMinutes /2));
        $(displayedData.averageDelay).html(getDelay((delayInMinutes /2) / (data.size - cancelled)));
        $(displayedData.totalCancelled).html(cancelled);
    }

    function reset() {
        cancelled = 0;
        delayInMinutes = 0;
        $(formStation.loading).show();
        $(formStation).html("");
    }

    function getDelay(minutes) {
        let daysDelay = Math.floor(minutes/1440);
        let hoursDelay = Math.floor((minutes - (daysDelay * 1440))/60);
        let delayed = "";
        (daysDelay)? delayed += (daysDelay.toString() + "d "): "";
        (hoursDelay)? delayed += (hoursDelay.toString() + "h ") : "";
        delayed += Math.round(minutes - ( daysDelay * 1440 ) - ( hoursDelay * 60 )) + "m";
        return delayed;
    }

    $.ajax({
        type: 'GET',
        url: 'https://desktopapps.ryanair.com/en-gb/res/stations',
        dataType: 'json'
    }).done(function (data) {
        stations = data;
        addStationOptions(data);
    }).fail(function (data) {
        disableButton(formStation.button, true);
        alert("Could not get ryanair stations.");
    }).always(function (data) {
        // console.log(data);
    });

    $(formStation.direction).on("click", function(e) {
        let id;
        let toggle = [
            {
                type: "arrival",
                text: "Arriving at:",
                degrees: -90
            },
            {
                type: "departure",
                text: "Departing from:",
                degrees: 90
            }
        ];
        (e.currentTarget.dataset.type == toggle[0].type)? id = 1: id = 0;
        type = toggle[id].type;
        e.currentTarget.dataset.type = toggle[id].type;
        e.currentTarget.innerHTML = toggle[id].text + '<small>change</small>';
        $(e.currentTarget.previousElementSibling).css("transform", "rotate("+toggle[id].degrees+"deg)");
    });

    $(formStation.select).on("change", function(e) {
        disableButton(formStation.button, false);
    });

    $(formStation.button).on("click", function(e) {
        e.preventDefault();
        let station = $(e.currentTarget.parentElement.firstElementChild).val();
        let url = "https://api.ryanair.com/flightinfo/3/flights/?";
        url += "&arrivalAirportIataCode=";
        url += (type == "arrival")? station: "";
        url += "&departureAirportIataCode=";
        url += (type == "departure")? station: "";
        url += "&departureTimeScheduledFrom=";
        url += "00:00";
        url += "&departureTimeScheduledTo=";
        url += "23:59";
        url += "&length=&number=&offset=";
        $.ajax({
            type: 'GET',
            url: url,
            dataType: 'json'
        }).done(function(data) {
            reset();
            addStationData(data);
        }).fail(function(data) {
            alert("Could not get specific ryanair station flight plan.");
        });
    });
});