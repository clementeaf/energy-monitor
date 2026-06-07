/**
 * Returns CSV template bytes for meter bulk import.
 * @returns UTF-8 CSV buffer with header and example rows
 */
export function buildMeterImportTemplateCsv(): Buffer {
  const lines = [
    'name,code,building_code,external_site_id,meter_type,model,serial_number,phase_type,load_category,parent_meter_code,hierarchy_node_name,modbus_address,bus_id,uplink_route,external_id,is_active',
    'Medidor General MG-001,MG-001,MM446,,electrical,PAC1670,SN123,three_phase,main,,Panel Principal,1,BUS-1,route-a,EXT-MG001,true',
    'Submedidor Tienda A,MG-002,MM446,,electrical,PAC1651,,three_phase,tenant,MG-001,Circuito A,2,,,true',
  ];
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}
