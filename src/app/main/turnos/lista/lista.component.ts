import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import { UserService } from 'src/app/services/user.service';
import { Firestore, collection, collectionData, doc, getFirestore, onSnapshot, query, updateDoc, where } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatPseudoCheckboxModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-lista',
  templateUrl: './lista.component.html',
  styleUrls: ['./lista.component.scss'],
})
export class ListaComponent implements OnInit{
  displayedColumns: string[] = ['doctor', 'especialidad', 'estado', 'fecha','horario','paciente','comentario','altura','peso','presion','temperatura','clave','cantidad', 'tomar', 'cancelar', 'rechazar', 'finalizar'];
  turnos:any[]=[]
  dataSource:any=new MatTableDataSource<ITurnos>(this.turnos);
  usuario:any;
  selected:any=""
  selectedEs:any=""
  especialistas:any[]=[];
  especialidades:any[]=[];
  pacientes:any[]=[];
  fil:string=''
  filA:string=''
  filT:string=''
  filP:string=''
  filPe:string=''
  filC:string=''
  filCant:string=''

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor(private firestore: Firestore, private auth: UserService, public dialog: MatDialog){}

  ngOnInit(): void {

    collectionData(collection(this.firestore,"especialidades")).subscribe(data =>{
      this.especialidades=[]
      data.forEach(e => { this.especialidades.push(e['nombre'])})
    })
    collectionData(collection(this.firestore,"usuarios")).subscribe(data =>{
      this.especialistas=[]
      data.forEach(e => { 
        if(e['tipo']=="especialista")
        this.especialistas.push(e)})
    })
    collectionData(collection(this.firestore,"usuarios")).subscribe(data =>{
      this.pacientes=[]
      data.forEach(e => { 
        if(e['tipo']=="user")
        this.pacientes.push(e)})
    })
    collectionData(collection(this.firestore, "usuarios")).subscribe((data) => {
      data.forEach(x =>{
        if(x['correo']==this.auth.retornarUsuario()){
          this.usuario=x;
        }
      })
    })
    const ref= collection(this.firestore, "turnos")
    collectionData(ref).subscribe(data =>{
      this.turnos=[]
      this.dataSource=null;
      data.forEach(turno => {
        if(this.auth.userUsed['tipo']=="especialista"){
          if(this.auth.retornarUsuario()==turno['doctor']  ){
            this.turnos.push(turno)
          }}
        else{
          if(turno['estado']=="libre"){
            this.turnos.push(turno)
          }
        }}
      )
      console.log(this.turnos)
      this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
      this.dataSource.paginator = this.paginator;
    })
  }
  p:any
  tomarTurnos(row:any, estado:string){
    if(this.auth.userUsed['tipo']=="user"){
      this.inscribirseTurno(row)
    }else{
      if(estado=="Cancelado"){
        this.Cancelar(estado, row)
      }else if(estado=="finalizado"){
        this.finalizarTurno(row)
      }
      else{
        this.confirmarTurno(row, estado)
      }
    }
  }
  finalizarTurno(row:any) {
    this.dialog.open(DialogElementsExampleDialog, {data :{
      especialidad:row['especialidad'],row:row
    }})
  }

  inscribirseTurno(row:any){
    if(row['estado']=="libre")
    {Swal.fire({
      icon:"warning",
      title:"Estas seguro que queres tomar este turno?",
      showCancelButton:true,
      cancelButtonText:"No",
      confirmButtonText:"Si!",
      heightAuto:false
    }).then((result) => {
      if (result.isConfirmed) {
        let borrables:any []=[]
        const t= collection(this.firestore, 'turnos');
        let q= query(t,where("doctor", "==",row['doctor']),where("fecha", "==",row['fecha']),where("horario","==",row['horario'])); ;
        this.p= onSnapshot(q, (snapshot)=>{
          snapshot.docs.forEach((x) =>{
           borrables.push(x.id);
          })
          console.log(borrables)
          const db= getFirestore();
          const data={
            estado: "a confirmar",
            paciente: this.auth.retornarUsuario()
          }
             const docref= doc(db,"turnos",borrables[0]);
             updateDoc(docref,data)
         })
        Swal.fire('Turno a espera de confirmacion!', '', 'success').then(()=>{this.p()})
      } else if (result.dismiss) {
        Swal.fire('Busca otro!', '', 'info')}
      })}
  }

  Cancelar(estado: string, elemento:any){
    let texto
    if(estado=="Cancelado") texto="cancelar"
    else texto="finalizar"
    Swal.fire({
      title: "Seguro que quieres " + texto+" el turno?",
      text: "Ingrese un comentario",
      input: "text",
      inputAttributes: {
        autocapitalize: "off"
      },
      showCancelButton: true,
      confirmButtonText: "Aceptar",
      cancelButtonText:"Cancelar",
      showLoaderOnConfirm: true,
      preConfirm: async (test) => {
        try {
          const borrables:any[]=[]
          const t= collection(this.firestore, 'turnos');
          let q= query(t,where("doctor", "==",elemento['doctor']),where("fecha", "==",elemento['fecha']),where("horario","==",elemento['horario'])); ;
          this.p= onSnapshot(q, (snapshot)=>{
            snapshot.docs.forEach((x) =>{
             borrables.push(x.id);
            })
            const db= getFirestore();
            const data={
              estado: estado,
              comentario: test
            }
               const docref= doc(db,"turnos",borrables[0]);
               updateDoc(docref,data)
           })
        } catch (error) {
          Swal.showValidationMessage(`
            Request failed: ${error}
          `);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    })
  }

  confirmarTurno(row:any, estado:string){
    // if(row['estado']=="a confirmar")
    Swal.fire({
      icon:"warning",
      title:"Estas seguro que queres cambiar el estado a " + estado+" de este turno?",
      showCancelButton:true,
      cancelButtonText:"No",
      confirmButtonText:"Si!",
      heightAuto:false
    }).then((result) => {
      if (result.isConfirmed) {
        let borrables:any []=[]
        const t= collection(this.firestore, 'turnos');
        let q= query(t,where("doctor", "==",row['doctor']),where("fecha", "==",row['fecha']),where("horario","==",row['horario'])); ;
        this.p= onSnapshot(q, (snapshot)=>{
          snapshot.docs.forEach((x) =>{
           borrables.push(x.id);
          })
          console.log(borrables)
          const db= getFirestore();
          const data={
            estado: estado,
          }
             const docref= doc(db,"turnos",borrables[0]);
             updateDoc(docref,data)
         })
        Swal.fire('Turno a espera de confirmacion!', '', 'success').then(()=>{this.p()})
      } else if (result.dismiss) {
        Swal.fire('Busca otro!', '', 'info')}
      })
  }

  VerificarAgregar(elemento:any){
    return (this.usuario['tipo']=="user" && elemento['estado']=="libre") || (this.usuario['tipo']=="especialista" && elemento['estado']=="a confirmar")
  }

  VerificarRechazar(elemento:any){
    return (this.usuario['tipo']=="especialista" && elemento['estado']=="a confirmar")
  }
  VerificarCancelar(elemento:any){
    return (this.usuario['tipo']!="especialsita" && (elemento['estado']=="confirmado" || elemento['estado']=="Cancelado" || elemento['estado']=="a confirmar" || elemento['estado']=="finalizado") ) || this.usuario['tipo']=="user"
  }

  VerificarFinalizar(elemento:any){
    return this.usuario['tipo']!="especialsita" && (elemento['estado']=="confirmado")
  }

  onSelectionChange(){
    this.selectedEs=""
    this.dataSource=[]
    const array:any=[]
    this.turnos.forEach((turno) =>{
      if(turno.especialidad==this.selected)
      array.push(turno)})
    this.dataSource=new MatTableDataSource<ITurnos>(array)
    this.dataSource.paginator = this.paginator;

  }
  onSelectionChangeEspecialista(){
    this.selected=""
    this.dataSource=[]
    const array:any=[]
    this.turnos.forEach((turno) =>{
      if(turno.doctor==this.selectedEs['correo'])
      array.push(turno)})
    this.dataSource=new MatTableDataSource<ITurnos>(array)
    this.dataSource.paginator = this.paginator;
  }

  filtro(filtro:string){
    switch(filtro){
      case 'estado':
        if(this.fil==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['estado']==this.fil))
        }
      break;
      case 'altura':
        if(this.filA==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['altura']==this.filA))}
        break;
      case 'peso':
        if(this.filPe==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['peso']==this.filPe))}
        break;
      case 'temperatura':
        if(this.filT==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['temperatura']==this.filT))}
        break;
      case 'presion':
        if(this.filP==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['presion']==this.filP))}
        break;
      case 'clave':
        if(this.filC==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['clave']==this.filC))}
        break;
      case 'cantidad':
        if(this.filCant==""){
          this.dataSource=new MatTableDataSource<ITurnos>(this.turnos)
        }else{
        this.dataSource=new MatTableDataSource<ITurnos>(this.turnos.filter(x => x['cantidad']==this.filCant))}
        break
    }
    this.dataSource.paginator = this.paginator;
  }

  onSelectionChangePaciente(){
    this.selected=""
    this.dataSource=[]
    const array:any=[]
    this.turnos.forEach((turno) =>{
      if(turno.paciente==this.selectedEs['correo'])
      array.push(turno)})
    this.dataSource=new MatTableDataSource<ITurnos>(array)
  }

  VerificarUsuario(){
    console.log(this.usuario)
    return this.usuario['tipo']=="user"
  }
}
export interface ITurnos {
  doctor: string;
  especialidad: string;
  estado: string;
  fecha: string;
  horario:string;
  paciente: string;
}

@Component({
  selector: 'dialog-elements-example-dialog',
  templateUrl: 'dialog-elements-example-dialog.html',
  standalone: true,
  imports: [MatDialogModule,MatInputModule,FormsModule,MatButtonModule],
})
export class DialogElementsExampleDialog  implements OnInit{
  altura: string=""
  peso: string=""
  temperatura: string=""
  presion:string=""
  datosDentistas:any={clave:'caries', cantidad:3, valor:false}
  datosClinica:any={clave:"medicamento", cantidad:10, valor:false}
  datosCirugia:any={clave:'reposo', cantidad:10, valor:false}
  datosOftalmologo:any={clave:'aumento', cantidad:0, valor:false}
  mostrador:string="";

  p:any
  constructor(
    public ref: MatDialogRef <DialogElementsExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private firestore: Firestore
  ) {}
  ngOnInit(): void {
    this.mostrador=this.data['especialidad'];
    // this.mostrador="Cirugia";
  }
  mostrar(){
    let historial:any
    switch(this.mostrador){
      case "Cirugia":
         historial={
          estado:"finalizado",
          altura: this.altura,
          peso:this.peso,
          presion:this.presion,
          temperatura:this.temperatura,
          clave: this.datosCirugia['clave'],
          valor: this.datosCirugia['cantidad']
        }
        break;
      case "Clinica":
         historial={
          estado:"finalizado",
          altura: this.altura,
          peso:this.peso,
          presion:this.presion,
          temperatura:this.temperatura,
          clave: this.datosClinica['clave'],
          valor: this.datosClinica['cantidad']
                }
        break;
        case "Odontologia":
         historial={
          estado:"finalizado",
          altura: this.altura,
          peso:this.peso,
          presion:this.presion,
          temperatura:this.temperatura,
          clave: this.datosDentistas['clave'],
          valor: this.datosDentistas['cantidad']
                }
        break;
        case "Oftalmologia":
         historial={
          estado:"finalizado",
          altura: this.altura,
          peso:this.peso,
          presion:this.presion,
          temperatura:this.temperatura,
          clave: this.datosOftalmologo['clave'],
          valor: this.datosOftalmologo['cantidad']  
              }
        break;
    }
    let borrables:any []=[]
    const t= collection(this.firestore, 'turnos');
    let q= query(t,where("doctor", "==",this.data['row']['doctor']),where("fecha", "==",this.data['row']['fecha']),where("horario","==",this.data['row']['horario'])); ;
    this.p= onSnapshot(q, (snapshot)=>{
      snapshot.docs.forEach((x) =>{
       borrables.push(x.id);
      })
      console.log(borrables)
      const db= getFirestore();
      
         const docref= doc(db,"turnos",borrables[0]);
         updateDoc(docref,historial)
         this.ref.close()
     })
  }
  
}