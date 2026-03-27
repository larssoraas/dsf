import { parseLocationString } from '../useMapListings';

describe('parseLocationString', () => {
  it('parses a valid "(lng,lat)" tuple string', () => {
    const result = parseLocationString('(10.7522,59.9139)');
    expect(result).toEqual({ lat: 59.9139, lng: 10.7522 });
  });

  it('parses negative coordinates', () => {
    const result = parseLocationString('(-73.9857,40.7484)');
    expect(result).toEqual({ lat: 40.7484, lng: -73.9857 });
  });

  it('parses coordinates without spaces', () => {
    const result = parseLocationString('(5.3221,60.3913)');
    expect(result).toEqual({ lat: 60.3913, lng: 5.3221 });
  });

  it('returns null for an empty string', () => {
    expect(parseLocationString('')).toBeNull();
  });

  it('returns null when only one value is present', () => {
    expect(parseLocationString('(10.75)')).toBeNull();
  });

  it('returns null for non-numeric content', () => {
    expect(parseLocationString('(abc,def)')).toBeNull();
  });

  it('returns null for a malformed string with extra commas', () => {
    // Three parts — first parseFloat will succeed but the second part is "b" → NaN
    expect(parseLocationString('(10.75,abc,extra)')).toBeNull();
  });

  it('handles zero coordinates', () => {
    const result = parseLocationString('(0,0)');
    expect(result).toEqual({ lat: 0, lng: 0 });
  });
});
