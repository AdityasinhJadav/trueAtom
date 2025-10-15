import { useState } from 'react'
import { Info, ChevronDown, X } from 'lucide-react'

export default function AudienceTargeting({ 
  targeting, 
  onTargetingChange 
}) {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [showTrafficDropdown, setShowTrafficDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [trafficSearch, setTrafficSearch] = useState('')

  const deviceTypes = [
    { id: 'all', label: 'All devices' },
    { id: 'desktop', label: 'Desktop' },
    { id: 'tablet', label: 'Tablet' },
    { id: 'mobile', label: 'Mobile' }
  ]

  const visitorTypes = [
    { id: 'all', label: 'All visitors' },
    { id: 'new', label: 'New only' },
    { id: 'returning', label: 'Returning only' }
  ]

  const trafficSources = [
    { id: 'organic', label: 'Organic' },
    { id: 'paid_search', label: 'Paid search' },
    { id: 'social', label: 'Social' },
    { id: 'email', label: 'Email' },
    { id: 'referral', label: 'Referral' }
  ]

  const countries = [
    { id: 'india', label: 'India' },
    { id: 'us', label: 'United States' },
    { id: 'uk', label: 'UK' },
    { id: 'australia', label: 'Australia' },
    { id: 'canada', label: 'Canada' }
  ]

  const handleDeviceChange = (deviceType) => {
    onTargetingChange({
      ...targeting,
      deviceType
    })
  }

  const handleVisitorTypeChange = (visitorType) => {
    onTargetingChange({
      ...targeting,
      visitorType
    })
  }

  const handleTrafficSourceToggle = (sourceId) => {
    const currentSources = targeting.trafficSources || []
    const newSources = currentSources.includes(sourceId)
      ? currentSources.filter(id => id !== sourceId)
      : [...currentSources, sourceId]
    
    onTargetingChange({
      ...targeting,
      trafficSources: newSources
    })
  }

  const handleCountryToggle = (countryId) => {
    const currentCountries = targeting.countries || []
    const newCountries = currentCountries.includes(countryId)
      ? currentCountries.filter(id => id !== countryId)
      : [...currentCountries, countryId]
    
    onTargetingChange({
      ...targeting,
      countries: newCountries
    })
  }

  const removeTrafficSource = (sourceId) => {
    const newSources = (targeting.trafficSources || []).filter(id => id !== sourceId)
    onTargetingChange({
      ...targeting,
      trafficSources: newSources
    })
  }

  const removeCountry = (countryId) => {
    const newCountries = (targeting.countries || []).filter(id => id !== countryId)
    onTargetingChange({
      ...targeting,
      countries: newCountries
    })
  }

  const filteredCountries = countries.filter(country =>
    country.label.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const filteredTrafficSources = trafficSources.filter(source =>
    source.label.toLowerCase().includes(trafficSearch.toLowerCase())
  )

  const getEstimatedVisitors = () => {
    let baseVisitors = 1000
    
    if (targeting.deviceType === 'mobile') baseVisitors *= 0.6
    else if (targeting.deviceType === 'tablet') baseVisitors *= 0.3
    else if (targeting.deviceType === 'desktop') baseVisitors *= 0.4
    
    if (targeting.visitorType === 'new') baseVisitors *= 0.4
    else if (targeting.visitorType === 'returning') baseVisitors *= 0.6
    
    const selectedSources = targeting.trafficSources || []
    if (selectedSources.length > 0) {
      baseVisitors *= (selectedSources.length / trafficSources.length)
    }
    
    const selectedCountries = targeting.countries || []
    if (selectedCountries.length > 0) {
      baseVisitors *= (selectedCountries.length / countries.length)
    }
    
    return Math.round(baseVisitors)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Audience Targeting</h3>
        <p className="text-sm text-gray-600">Define who sees your price test</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Device Type</label>
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Choose which devices to target
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {deviceTypes.map((device) => (
            <button
              key={device.id}
              onClick={() => handleDeviceChange(device.id)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                targeting.deviceType === device.id
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              {device.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Visitor Type</label>
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Target new or returning visitors
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visitorTypes.map((visitor) => (
            <button
              key={visitor.id}
              onClick={() => handleVisitorTypeChange(visitor.id)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                targeting.visitorType === visitor.id
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              {visitor.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Traffic Source</label>
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Select traffic sources to target
            </div>
          </div>
        </div>
        {(targeting.trafficSources || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {(targeting.trafficSources || []).map((sourceId) => {
              const source = trafficSources.find(s => s.id === sourceId)
              return (
                <div key={sourceId} className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  <span>{source?.label}</span>
                  <button onClick={() => removeTrafficSource(sourceId)} className="text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="relative">
          <button onClick={() => setShowTrafficDropdown(!showTrafficDropdown)} className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 bg-white">
            <span className="text-sm text-gray-900">Select traffic sources...</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showTrafficDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-2">
                <input type="text" placeholder="Search sources..." value={trafficSearch} onChange={(e) => setTrafficSearch(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredTrafficSources.map((source) => (
                  <button key={source.id} onClick={() => handleTrafficSourceToggle(source.id)} className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 text-gray-900">
                    <div className={`w-4 h-4 border border-gray-300 rounded mr-2 flex items-center justify-center ${ (targeting.trafficSources || []).includes(source.id) ? 'bg-blue-500 border-blue-500' : '' }`}>
                      {(targeting.trafficSources || []).includes(source.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    {source.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Country</label>
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Select countries to target
            </div>
          </div>
        </div>
        {(targeting.countries || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {(targeting.countries || []).map((countryId) => {
              const country = countries.find(c => c.id === countryId)
              return (
                <div key={countryId} className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  <span>{country?.label}</span>
                  <button onClick={() => removeCountry(countryId)} className="text-green-600 hover:text-green-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="relative">
          <button onClick={() => setShowCountryDropdown(!showCountryDropdown)} className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 bg-white">
            <span className="text-sm text-gray-900">Select countries...</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showCountryDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-2">
                <input type="text" placeholder="Search countries..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button key={country.id} onClick={() => handleCountryToggle(country.id)} className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 text-gray-900">
                    <div className={`w-4 h-4 border border-gray-300 rounded mr-2 flex items-center justify-center ${ (targeting.countries || []).includes(country.id) ? 'bg-green-500 border-green-500' : '' }`}>
                      {(targeting.countries || []).includes(country.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    {country.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {null}

      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-900">Estimated Reach</h4>
            <p className="text-xs text-blue-700">Based on your targeting criteria</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-900">{getEstimatedVisitors().toLocaleString()}</div>
            <div className="text-xs text-blue-700">visitors / day</div>
          </div>
        </div>
      </div>
    </div>
  )
}


