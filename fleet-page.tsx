import React, { useState } from 'react';
import { useUav } from '@/contexts/UavContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Uav } from '@shared/schema';

export default function FleetPage() {
  const { uavs, loading, selectUav } = useUav();
  const [selectedUavId, setSelectedUavId] = useState<number | null>(null);
  
  if (loading) {
    return <FleetPageSkeleton />;
  }
  
  // Handle UAV selection
  const handleUavSelect = (uav: Uav) => {
    selectUav(uav);
    setSelectedUavId(uav.id);
  };
  
  // Get UAV status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success">Active</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-black">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-critical">Critical</Badge>;
      case 'offline':
        return <Badge variant="outline">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get class for battery level
  const getBatteryClass = (level: number) => {
    if (level >= 75) return 'text-success';
    if (level >= 40) return 'text-warning';
    return 'text-critical';
  };
  
  // Prepare fleet data
  const activeUavs = uavs.filter(uav => uav.status !== 'offline');
  const offlineUavs = uavs.filter(uav => uav.status === 'offline');
  
  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800">UAV Fleet Management</h1>
                  <p className="text-neutral-500 mt-1">Overview and management of your unmanned aerial vehicles fleet</p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-3">
                  <Button variant="outline" className="flex items-center">
                    <span className="material-icons text-sm mr-1.5">add</span>
                    Add UAV
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Fleet Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">Total UAVs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uavs.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{activeUavs.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">Offline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-neutral-400">{offlineUavs.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500">Average Battery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activeUavs.length > 0 
                      ? `${Math.round(activeUavs.reduce((sum, uav) => sum + uav.batteryLevel, 0) / activeUavs.length)}%` 
                      : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* UAV Fleet Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>UAV Fleet</CardTitle>
                <CardDescription>Overview of all registered unmanned aerial vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Battery</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uavs.map((uav) => (
                      <TableRow 
                        key={uav.id} 
                        className={`${selectedUavId === uav.id ? 'bg-primary bg-opacity-10' : 'hover:bg-neutral-50'}`}
                      >
                        <TableCell className="font-medium">{uav.id}</TableCell>
                        <TableCell>{uav.name}</TableCell>
                        <TableCell>{uav.type}</TableCell>
                        <TableCell>{getStatusBadge(uav.status)}</TableCell>
                        <TableCell className={getBatteryClass(uav.batteryLevel)}>
                          {uav.batteryLevel}%
                        </TableCell>
                        <TableCell>{uav.location || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleUavSelect(uav)}
                            >
                              <span className="material-icons" style={{fontSize: '18px'}}>visibility</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="material-icons" style={{fontSize: '18px'}}>edit</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {uavs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <span className="material-icons text-4xl text-neutral-300 mb-2">airplanemode_inactive</span>
                          <p className="text-neutral-500">No UAVs available</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Additional Fleet Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>UAV Types</CardTitle>
                  <CardDescription>Distribution by device types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      uavs.reduce((acc: Record<string, number>, uav) => {
                        acc[uav.type] = (acc[uav.type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="material-icons mr-2">
                            {type.toLowerCase().includes('quad') ? 'propeller' : 
                             type.toLowerCase().includes('fixed') ? 'flight' : 'drone'}
                          </span>
                          <span>{type}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                    
                    {uavs.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-neutral-500">No UAV type data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>UAV Statuses</CardTitle>
                  <CardDescription>Distribution by device statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['active', 'warning', 'critical', 'offline'].map(status => {
                      const count = uavs.filter(uav => uav.status === status).length;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              status === 'active' ? 'bg-success' :
                              status === 'warning' ? 'bg-warning' :
                              status === 'critical' ? 'bg-critical' :
                              'bg-neutral-300'
                            }`}></span>
                            <span className="capitalize">{status}</span>
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FleetPageSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <div className="bg-white border-b border-neutral-200 shadow-sm z-10 h-14">
        <Skeleton className="h-full w-full" />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-16 md:w-64 bg-white border-r border-neutral-200">
          <Skeleton className="h-full w-full" />
        </aside>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="container mx-auto">
            <Skeleton className="h-20 w-full mb-6" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            
            <Skeleton className="h-96 w-full mb-6" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}