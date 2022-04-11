module['exports'] = (config) => {

    const
        hrt       = config['hrt'] || (() => (Date.now()) / 1000),
        id        = `${config['root']}server/`,
        heartbeat = config['heartbeat'],
        _cpus     = []
    ; // const

    let
        os             = config['os']
        ,
        server         = {}
        ,
        PEP            = config['PEP'],
        space          = config['space'],
        server_status  = undefined,
        server_running = false
        ,
        cpu_usage      = null
        ,
        startMeasure   = cpuAverage(),
        samples        = []
        ,

        _id_
    ; // let

    //region fn

    function run() {

        return new Promise((resolve, reject) => {
            try {
                server_status  = "running";
                server_running = true;
                if (heartbeat['cpu_usage_per_second'])
                    _heartbeat_cpu_usage_fn(heartbeat['cpu_usage_per_second']);

            } catch (jex) {
                reject(jex);
            } // try
        }); // return P

    } // function start_running()

    function pause_running(server, status) {
        status = "paused";

    } // function pause_running()

    function stop_running(server, running, status) {
        status  = "stopped";
        running = false;
    } // function stop_running()

    function sample() {
        let
            currCpus = os.cpus()
        ;
        for (let i = 0, len = currCpus.length; i < len; i++) {
            var
                prevCpu = prevCpus[i],
                currCpu = currCpus[i],
                deltas  = {total: 0}
            ;
            for (let t in prevCpu.times)
                deltas.total += currCpu.times[t] - prevCpu.times[t];
            for (let t in prevCpu.times)
                deltas[t] = currCpu.times[t] - prevCpu.times[t];
        }
        prevCpus = currCpus;
        samples.push(deltas);
        if (samples.length > 100) samples.shift()
    } // function sample()

    function cpuAverage() {

        //Initialise sum of idle and time of cores and fetch CPU info
        let
            totalIdle = 0,
            totalTick = 0,
            cpus      = os.cpus(),
            cpu
        ;

        //Loop through CPU cores
        for (let i = 0, len = cpus.length; i < len; i++) {

            //Select CPU core
            cpu = cpus[i];

            //Total up the time in the cores tick
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }

            //Total up the idle time of the core
            totalIdle += cpu.times.idle;
        }

        //Return the average Idle and Tick times
        return {idle: totalIdle / cpus.length, total: totalTick / cpus.length};
    } // function cpuAverage()

    function _heartbeat_cpu_usage_fn(beatPerSecond) {

        let handle = setTimeout(
            function () {
                //Grab second Measure
                let
                    endMeasure      = cpuAverage(),
                    //Calculate the difference in idle and total time between the measures
                    idleDifference  = endMeasure.idle - startMeasure.idle,
                    totalDifference = endMeasure.total - startMeasure.total,
                    //Calculate the average percentage CPU usage
                    percentageCPU   = 100 - ~~(100 * idleDifference / totalDifference)
                ;

                //Output result to console
                //console.log(percentageCPU + "% CPU Usage.");
                cpu_usage['fua:sts']['@value']   = hrt();
                cpu_usage['fua:vts']['@value']   = hrt();
                cpu_usage['fua:value']['@value'] = percentageCPU;

                PEP.enforce({
                    '@id':       `urn:app:event:broadcast:send`,
                    'prov':      "router.gbx.data:Server:cpu_usage:_heartbeat_fn",
                    'parameter': {'resource': cpu_usage}
                }).then(result => {
                    result;
                }).catch(err => {
                    console.warn(`agent.Server : PEP.enforce.catch(<${err.toString()}>)`);
                });

                _heartbeat_cpu_usage_fn(beatPerSecond);
            }, // fn
            (1000 * (1 / beatPerSecond))
        ); // setTimeout()

    } // _heartbeat_fn_handle()

    //endregion fn

    os.cpus().forEach((item, index, array) => {
        _id_ = `${id}cpu_${index}`;
        space.set({
            '@id':           _id_,
            '@type':         ["gbx:Cpu", "rdfs:Resource"],
            'rdfs:label':    `cpu_${index}`,
            'gbx:cpu_model': {'@type': "xsd:string", '@value': item['model']},
            'gbx:cpu_speed': {'@type': "xsd:decimal", '@value': item['speed']}
        });
        _cpus.push(space.get(_id_));
    });

    _id_ = `${id}cpu_usage`;
    space.set({
        '@id':        `${_id_}`,
        '@type':      "fua:DataProperty",
        'rdfs:label': "cpu usage",
        'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        'fua:value':  {'@type': "xsd:decimal", '@value': -1}
    });
    cpu_usage = space.get(_id_);

    Object.defineProperties(server, {
        '@id':     {value: `${config['root']}server/`},
        '@type':   {value: "fua:Server"}
        ,
        'cpus':    {get: () => _cpus}
        ,
        'run':     {value: run}
        ,
        'running': {get: () => server_running},
        'status':  {get: () => server_status}
    });

    Object.seal(server);

    startMeasure = cpuAverage();

    return server;

};

/**

 //region Server
 if (false) {
        //TODO: higher level?!? For shure...
        const
            os = require("os")
        ;

        let
            _srv_cpu_usage_        = undefined,
            _srv_cpu_usage_last10  = undefined,
            _srv_cpu_usage_last50  = undefined,
            _srv_cpu_usage_last100 = undefined
        ;

        //Create function to get CPU information
        function cpuAverage() {

            //Initialise sum of idle and time of cores and fetch CPU info
            let
                totalIdle = 0,
                totalTick = 0,
                cpus      = os.cpus(),
                cpu
            ;

            //Loop through CPU cores
            for (let i = 0, len = cpus.length; i < len; i++) {

                //Select CPU core
                cpu = cpus[i];

                //Total up the time in the cores tick
                for (type in cpu.times) {
                    totalTick += cpu.times[type];
                }

                //Total up the idle time of the core
                totalIdle += cpu.times.idle;
            }

            //Return the average Idle and Tick times
            return {idle: totalIdle / cpus.length, total: totalTick / cpus.length};
        }

        //Grab first CPU Measure
        let
            startMeasure = cpuAverage(),
            samples      = [],
            prevCpus     = os.cpus()
        ;

        setInterval(sample, 100);
        setInterval(print, 5000);

        function print() {
            let
                result  = {
                    'last10':  null,
                    'last50':  null,
                    'last100': null
                }, //result
                percent = 0,
                i       = samples.length,
                j       = 0
            ;
            while (i--) {
                j++;
                if (samples[i].total > 0)
                    percent += (100 - Math.round(100 * samples[i].idle / samples[i].total));
                if (j === 10) result.last10 = (percent / j);
                else if (j === 50) result.last50 = (percent / j);
                else if (j === 100) result.last100 = (percent / j);
            } // while
            _srv_cpu_usage_last10['fua:value']['@value']  = result['last10'];
            _srv_cpu_usage_last10['fua:sts']['@value']    = hrt();
            _srv_cpu_usage_last10['fua:vts']['@value']    = hrt();
            _srv_cpu_usage_last50['fua:value']['@value']  = result['last50'];
            _srv_cpu_usage_last50['fua:sts']['@value']    = hrt();
            _srv_cpu_usage_last50['fua:vts']['@value']    = hrt();
            _srv_cpu_usage_last100['fua:value']['@value'] = result['last100'];
            _srv_cpu_usage_last100['fua:sts']['@value']   = hrt();
            _srv_cpu_usage_last100['fua:vts']['@value']   = hrt();
            //console.log(result);
        } // print

        function sample() {
            let
                currCpus = os.cpus()
            ;
            for (let i = 0, len = currCpus.length; i < len; i++) {
                var
                    prevCpu = prevCpus[i],
                    currCpu = currCpus[i],
                    deltas  = {total: 0}
                ;
                for (let t in prevCpu.times)
                    deltas.total += currCpu.times[t] - prevCpu.times[t];
                for (let t in prevCpu.times)
                    deltas[t] = currCpu.times[t] - prevCpu.times[t];
            }
            prevCpus = currCpus;
            samples.push(deltas);
            if (samples.length > 100) samples.shift()
        } // sample

        //let
        //    _heartbeat_fn_handle,
        //    _heartbeat_timeout = 1000
        //;

        //function _heartbeat_fn() {
        //
        //    _heartbeat_fn_handle = setTimeout(
        //        function () {
        //            //Grab second Measure
        //            let
        //                endMeasure      = cpuAverage(),
        //                //Calculate the difference in idle and total time between the measures
        //                idleDifference  = endMeasure.idle - startMeasure.idle,
        //                totalDifference = endMeasure.total - startMeasure.total,
        //                //Calculate the average percentage CPU usage
        //                percentageCPU   = 100 - ~~(100 * idleDifference / totalDifference)
        //            ;
        //
        //            //Output result to console
        //            //console.log(percentageCPU + "% CPU Usage.");
        //            _srv_cpu_usage_['fua:sts']['@value']   = hrt();
        //            _srv_cpu_usage_['fua:vts']['@value']   = hrt();
        //            _srv_cpu_usage_['fua:value']['@value'] = percentageCPU;
        //
        //            PEP.enforce({
        //                '@id':       `urn:app:event:broadcast:send`,
        //                'prov':      "router.gbx.data:Server:cpu_usage:_heartbeat_fn",
        //                'parameter': {'resource': _srv_cpu_usage_}
        //            }).then(result => {
        //                result;
        //            }).catch(err => {
        //                err;
        //            });
        //
        //            _heartbeat_fn();
        //        }, // fn
        //
        //        _heartbeat_timeout
        //    ); // setTimeout()
        //
        //} // _heartbeat_fn_handle()

        //_id_ = `${root_container_uri}server`;
        //space.set({
        //    '@id':                   _id_,
        //    '@type':                 ["gbx:Server", "ldp:Resource"],
        //    'rdfs:label':            [{'@language': "en", '@value': "Server"}],
        //    'gbx:cpu':               [],
        //    'gbx:cpu_usage':         undefined,
        //    'gbx:cpu_usage_last10':  undefined,
        //    'gbx:cpu_usage_last50':  undefined,
        //    'gbx:cpu_usage_last100': undefined,
        //    'gbx:get_per_second':    undefined
        //});
        //const _srv_ = space.get(_id_);
        //_id_        = `${root_container_uri}host/cpu_usage`;
        //space.set({
        //    '@id':        `${_id_}`,
        //    '@type':      "fua:DataProperty",
        //    'rdfs:label': [{'@language': "en", '@value': "cpu usage"}],
        //    'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:value':  {'@type': "xsd:decimal", '@value': -1}
        //});
        //_srv_cpu_usage_        = space.get(_id_);
        //_srv_['gbx:cpu_usage'] = _srv_cpu_usage_;
        //
        //_id_ = `${root_container_uri}server/cpu_usage/last10`;
        //space.set({
        //    '@id':        `${_id_}`,
        //    '@type':      "fua:DataProperty",
        //    'rdfs:label': [{'@language': "en", '@value': "cpu usage, last 10"}],
        //    'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:value':  {'@type': "xsd:decimal", '@value': -1},
        //    'fua:unit':   {'@type': "xsd:string", '@value': "percent"}
        //});
        //_srv_cpu_usage_last10         = space.get(_id_);
        //_srv_['gbx:cpu_usage_last10'] = _srv_cpu_usage_last10;
        //
        //_id_ = `${root_container_uri}server/cpu_usage/last50`;
        //space.set({
        //    '@id':        `${_id_}`,
        //    '@type':      "fua:DataProperty",
        //    'rdfs:label': [{'@language': "en", '@value': "cpu usage, last 50"}],
        //    'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:value':  {'@type': "xsd:decimal", '@value': -1}
        //});
        //_srv_cpu_usage_last50         = space.get(_id_);
        //_srv_['gbx:cpu_usage_last50'] = _srv_cpu_usage_last50;
        //
        //_id_ = `${root_container_uri}server/cpu_usage/last100`;
        //space.set({
        //    '@id':        `${_id_}`,
        //    '@type':      "fua:DataProperty",
        //    'rdfs:label': [{'@language': "en", '@value': "cpu usage, last 100"}],
        //    'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:value':  {'@type': "xsd:decimal", '@value': -1}
        //});
        //_srv_cpu_usage_last100         = space.get(_id_);
        //_srv_['gbx:cpu_usage_last100'] = _srv_cpu_usage_last100;

        //_id_ = `${root_container_uri}server/get_per_second`;
        //space.set({
        //    '@id':        `${_id_}`,
        //    '@type':      "fua:DataProperty",
        //    'rdfs:label': [{'@language': "en", '@value': "GET per second"}],
        //    'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
        //    'fua:value':  {'@type': "xsd:decimal", '@value': -1}
        //});
        //_srv_['gbx:get_per_second'] = space.get(_id_);

        //os.cpus().forEach((item, index, array) => {
        //    _id_ = `${_srv_['@id']}/cpu_${index}`;
        //    space.set({
        //        '@id':           _id_,
        //        '@type':         ["gbx:Cpu", "ldp:Resource"],
        //        'rdf:label':     `cpu_${index}`,
        //        'gbx:cpu_model': {'@type': "xsd:string", '@value': item['model']},
        //        'gbx:cpu_speed': {'@type': "xsd:decimal", '@value': item['speed']}
        //        //'gbx:cpu_time_idle': {'@type': "xsd:decimal", '@value': item['times']['idle']},
        //        //'gbx:cpu_time_user': {'@type': "xsd:decimal", '@value': item['times']['user']}
        //    });
        //    _srv_['gbx:cpu'].push(space.get(_id_));
        //});

        //TODO: get it back!!! >>> space.get(`${root_container_uri}objects/`).contains = _srv_;

        //_heartbeat_fn();
    } // if (Server shield)
 //endregion Server

 */