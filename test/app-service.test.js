const {sum} = require('./sampletest.js');

test('properly adds two numbers', ()=>{
   expect(sum(80,20)).toBe(100)
})