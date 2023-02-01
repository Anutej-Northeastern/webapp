const {sum} = require('./sampletest.js');

test('properly adds two numbers', ()=>{
   expect(sum(80,20)).toBe(100)
})
const request = require('supertest');
const {app} = require('../server.js');

describe('GET /healthz', () => {
    it('should return a 200 status code and an empty JSON object', async () => {
        const res = await request(app).get('/healthz');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({});
    });
    
    it('should return a 501 status code and error object on error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).get('/heal');
        expect(res.status).toBe(501);
        expect(typeof res.body).toBe('object');
        console.error.mockRestore();
    });
});