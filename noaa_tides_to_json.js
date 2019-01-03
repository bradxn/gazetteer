const readline = require('readline');

var obj = { };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  crlfDelay: Infinity,
  terminal: false
});

rl.on('line', (input) => {
    let a = input.match(/^\# ([^:]+):\s*(.*)$/);
    if (a)
    {
        let name = a[1].replace(/\s+/g, '_').toLowerCase();
        let value = a[2];

        switch (name)
        {
        case 'source':
        case 'disclaimer':
        case 'product_type':
        case 'from':
            return; // ignore these

        case 'latitude':
        case 'longitude':
        case 'mean_flood_dir':
        case 'mean_ebb_dir':
            value = parseFloat(value);
            break;

        case 'depth':
            if (value == 'Unknwon')
                value = null;
            break;
        }
        
        obj[name] = value;
    }
    else
    {
        a = input.match(/^(\S+ \S+ \S\S)\s+(\S+)\s+(\S+)$/);
        if (a)
        {
            let p = {
                t: a[1],
                e: a[2],
                v: a[3]
            };

            if (p.v == '-')
                delete p.v;
            else
                p.v = parseFloat(p.v);

            if (!obj.predictions)
                obj.predictions = [];
            obj.predictions.push(p);
        }
    }
});

rl.on('close', () => {
    console.log(JSON.stringify(obj, null, 4));
    process.exit(0);
});
